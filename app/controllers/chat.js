/* global log */

var moment = require('alloy/moment');

(function constructor(args) {

	// Listen to collection changes
	Alloy.Collections.message.on('fetch destroy change add remove reset', onChange);

	// Fetch existing messages from the SQLite store
	Alloy.Collections.message.fetch();

	// Fired by notifications.js when a sample notification
	Alloy.Events.on('message', onMessage);

	// Resize the container when the keyboards shows/hides
	Ti.App.addEventListener('keyboardframechanged', onKeyboardframechanged);

	Ti.App.addEventListener('resume', onResume);

})(arguments[0] || {});

function onChange(model) {

	// no messages
	if (Alloy.Collections.message.length === 0) {

		// create first
		Alloy.Collections.message.create({
			id: Ti.Platform.createUUID(),
			message: 'Hey, how are you? Send me a message, then move the app to the background or lock your phone to get a reply.',
			mine: 0,
			sent: Date.now()
		});

	} else {

		// scroll down each time something changes
		scrollDown();
	}
}

function onMessage(e) {
	var model = Alloy.Collections.message.get(e.id);

	if (e.action === 'DELETE') {

		model.destroy();

		log('Chat: Deleted message ' + e.id + '.');

	} else {

		model.save({
			read: Date.now()
		});

		log('Chat: Marked message ' + e.id + ' as read.');

		switch (e.action) {

			case 'OK':

				Alloy.Collections.message.create({
					id: Ti.Platform.createUUID(),
					message: '👍',
					mine: 1,
					sent: Date.now()
				});

				scheduleFakeResponse();

				log('Chat: Replied 👍 to message ' + e.id + '.');
				break;

			case 'NOK':

				Alloy.Collections.message.create({
					id: Ti.Platform.createUUID(),
					message: '👎',
					mine: 1,
					sent: Date.now()
				});

				scheduleFakeResponse();

				log('Chat: Replied 👎 to message ' + e.id + '.');
				break;

			default:

				// Make tab active
				$.tab.active = true;

				log('Chat: Opened chat with message ' + e.id + ' to reply.');
				break;
		}
	}
}

function scrollDown() {
	$.listView.scrollToItem(0, $.listView.sections[0].items.length - 1);
}

function onKeyboardframechanged(e) {
	var tabsHeight = 50;

	// Full screen height minus keyboard start (from top) minus tabs height
	// If the keyboard is down this will be -50, so at least do 0
	$.container.bottom = Math.max(0, Ti.Platform.displayCaps.platformHeight - e.keyboardFrame.y - tabsHeight);
}

function onResume(e) {

	if ($.tab.active) {
		markAllRead();
	}
}

function getUnread() {
	return Alloy.Collections.message.where({
		read: 0
	});
}

function markAllRead() {

	_.each(getUnread(), function (model) {

		model.save({
			read: Date.now()
		}, {
			silent: true
		});
	});

	Alloy.Collections.message.trigger('fetch');

	// Reset app and tab badge number
	updateBadges();
}

function hideKeyboard(e) {
	console.log(e);

	if (e.source.id !== 'textField') {
		$.textField.blur();
	}
}

function deleteMessage(e) {
	Alloy.Collections.message.get(e.itemId).destroy();
}

function sendMessage(e) {

	if (!e.value) {
		return;
	}

	$.textField.value = '';

	Alloy.Collections.message.create({
		id: Ti.Platform.createUUID(),
		message: e.value,
		mine: 1,
		sent: Date.now(),

		// would normally come back from the server when the receiver has read it
		read: Date.now() + 1000
	});

	scheduleFakeResponse();
}

function transformMessage(model) {
	var mine = !!model.get('mine');

	var meta = (mine ? 'Sent' : 'Received') + ' ' + moment(model.get('sent')).format('HH:mm:ss');

	var read = model.get('read');

	if (read) {
		meta += ', read ' + moment(read).format('HH:mm:ss');
	}

	return {
		template: mine ? 'mine' : 'theirs',
		meta: meta
	};
}

function scheduleFakeResponse() {

	// After 5 seconds
	setTimeout(function () {

		// Create the response
		var response = Alloy.Collections.message.create({
			id: Ti.Platform.createUUID(),

			// Pick a random response
			message: Alloy.CFG.messages[_.random(Alloy.CFG.messages.length - 1)],

			mine: 0,
			sent: Date.now()
		});

		updateBadges();

		// Notifiy the user
		Ti.App.iOS.scheduleLocalNotification({
			alertAction: 'Reply',
			alertBody: response.get('message'),
			category: 'CHAT_CATEGORY',
			sound: 'notification.caf',
			userInfo: {
				id: response.id
			}
		});

		log('Chat: Notifying about a fake response with message ID: ' + response.id);

	}, Alloy.CFG.delay);
}

function updateBadges() {
	var unreads = getUnread().length;

	$.tab.badge = unreads || null;
	Ti.UI.iPhone.appBadge = unreads;
}
