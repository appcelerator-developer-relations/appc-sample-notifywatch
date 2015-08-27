/* global log */

var moment = require('alloy/moment');

/**
 * Self-executing function containing all code that is executed when an instance
 * of this controller is created, apart from dependencies and variables declared
 * above. Just for readability, much like a class constructor.
 */
(function constructor(args) {

	// Listen to collection changes
	Alloy.Collections.message.on('fetch destroy change add remove reset', onChange);

	// Fetch existing messages from the SQLite store
	Alloy.Collections.message.fetch();

	// Fired by notifications.js when a notifications is received or responded to
	Alloy.Events.on('action', onAction);

	// Resize the container when the keyboards shows/hides
	Ti.App.addEventListener('keyboardframechanged', onKeyboardframechanged);

	// When the app resumes see if this has focus and if so, mark all messages as read
	Ti.App.addEventListener('resume', onResume);

})(arguments[0] || {});

/**
 * Event listener set in constructor to be called when the message collection changes
 *
 * @param      {Object}  model   Collection or model that was changed
 */
function onChange(model) {

	// Collection is empty
	if (Alloy.Collections.message.length === 0) {

		// Create first message
		Alloy.Collections.message.create({
			id: Ti.Platform.createUUID(),
			message: 'Hey, how are you? Send me a message, then move the app to the background or lock your phone to get a reply.',
			mine: 0,
			sent: Date.now()
		});

	} else {

		// Scroll down each time something changes
		scrollDown();
	}
}

/**
 * Event listener set in constructor to be called when a notification is received
 * or responsed to so it can be handled.
 *
 * @param      {Object}  e       Event
 */
function onAction(e) {

	// Get the related message model
	var model = Alloy.Collections.message.get(e.id);

	// Delete action was selected
	if (e.action === 'DELETE') {

		model.destroy();

		log('Chat: Deleted message ' + e.id + '.');

	} else {

		// Mark the message as read
		model.save({
			read: Date.now()
		});

		log('Chat: Marked message ' + e.id + ' as read.');

		switch (e.action) {

			// OK (thumbs up) action
			case 'OK':

				// Create OK message
				Alloy.Collections.message.create({
					id: Ti.Platform.createUUID(),
					message: '👍',
					mine: 1,
					sent: Date.now()
				});

				log('Chat: Replied 👍 to message ' + e.id + '.');

				// Schedule fake response
				scheduleFakeResponse();

				break;

				// Not OK (thumbs down) action
			case 'NOK':

				// Create Not OK message
				Alloy.Collections.message.create({
					id: Ti.Platform.createUUID(),
					message: '👎',
					mine: 1,
					sent: Date.now()
				});

				log('Chat: Replied 👎 to message ' + e.id + '.');

				// Schedule fake response
				scheduleFakeResponse();

				break;

				// No action was selected
			default:

				// Make this tab active if it's not already so user can handle it
				$.tab.active = true;

				log('Chat: Opened chat with message ' + e.id + ' to reply.');

				break;
		}
	}
}

/**
 * Called by onChange() and as event listener for the ListView's postlayout event
 * to scroll all the way down to the latest message.
 */
function scrollDown() {
	$.listView.scrollToItem(0, $.listView.sections[0].items.length - 1);
}

/**
 * Event listener set in constructor to be called when the keyboard shows or
 * hides so we can resize the container of both the ListView and TextField.
 */
function onKeyboardframechanged(e) {

	// FIXME: Kind of tricky since this might change in future iOS but did not
	// find a way to get the Tab Bar height from some proxy.
	var tabsHeight = 50;

	// Full screen height minus keyboard start (from top) minus tabs height
	// If the keyboard is down this will be -50, so at least do 0
	$.container.bottom = Math.max(0, Ti.Platform.displayCaps.platformHeight - e.keyboardFrame.y - tabsHeight);
}

/**
 * Event listener set in constructor to be called when the app resumes.
 *
 * @param      {Object}  e       Event
 */
function onResume(e) {

	// If the current tab is active
	if ($.tab.active) {

		// Mark all messages as read
		markAllRead();
	}
}


/**
 * Called by onResume() and set as event listener in the view to mark all messages as read.
 */
function markAllRead() {

	// Get all unread messages
	_.each(getUnread(), function (model) {

		// Set as read without triggering the data-binding for each
		model.save({
			read: Date.now()
		}, {
			silent: true
		});
	});

	// Trigger the change event to update the UI via data-binding
	Alloy.Collections.message.trigger('fetch');

	// Reset app and tab badge number
	updateBadges();
}

/**
 * Called by markAllRead() and updateBadges() to get all unread messages.
 *
 * @return     {Array}  Array of message models
 */
function getUnread() {
	return Alloy.Collections.message.where({
		read: 0
	});
}

/**
 * Event listener set in the view to be called when the user taps on a ListView
 * item to blur the TextField and by doing so hide the keyboard.
 *
 * @param      {Object}  e       Event
 */
function hideKeyboard(e) {
	$.textField.blur();
}

/**
 * Event listener set in the view to be called when a ListView item is swiped
 * from right to left to delete it.
 *
 * @param      {Object}  e       Event
 */
function deleteMessage(e) {
	Alloy.Collections.message.get(e.itemId).destroy();
}

/**
 * Event listener set in view to be called when user hits send on the keyboard
 * after typing a message in the TextField. It should send the message.
 *
 * @param      {Object}  e       Event
 */
function sendMessage(e) {

	// Don't send empty messages
	if (!e.value) {
		return;
	}

	// Empty the TextField for the next message
	$.textField.value = '';

	// Create the message model
	Alloy.Collections.message.create({
		id: Ti.Platform.createUUID(),
		message: e.value,
		mine: 1,
		sent: Date.now(),

		// Simulate that it would normally get a ping from the other user when they have read it
		read: Date.now() + 1000
	});

	// Schedule a fake response from out bot
	scheduleFakeResponse();
}

/**
 * Function set in the view to be called on each model before rendering it in the ListView
 *
 * @method     transformMessage
 * @param      {Object}  The original model
 * @return     {Object}  New or changed attributes
 */
function transformMessage(model) {

	// Convert 1|0 to bool
	var mine = !!model.get('mine');

	// Create the meta string
	var meta = (mine ? 'Sent' : 'Received') + ' ' + moment(model.get('sent')).format('HH:mm:ss');

	// Get the read-date
	var read = model.get('read');

	if (read) {

		// Add the read-date to the meta
		meta += ', read ' + moment(read).format('HH:mm:ss');
	}

	return {
		template: mine ? 'mine' : 'theirs',
		meta: meta
	};
}

/**
 * Function called in different places in this controller to schedule a fake response
 * from our bot.
 */
function scheduleFakeResponse() {

	// After delay set in config.json
	setTimeout(function () {

		// Create the response
		var response = Alloy.Collections.message.create({
			id: Ti.Platform.createUUID(),

			// Pick a random response from the options in config.json
			message: Alloy.CFG.messages[_.random(Alloy.CFG.messages.length - 1)],

			mine: 0,
			sent: Date.now()
		});

		updateBadges();

		// Notifiy the user right away (no date)
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

/**
 * Function called in different places in this controller to update the app and tab badge.
 */
function updateBadges() {

	// Get the number of unread messages
	var unreads = getUnread().length;

	// Set the tab and app badge
	$.tab.badge = unreads || null;
	Ti.UI.iPhone.appBadge = unreads;
}
