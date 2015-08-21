/* global log */

(function constructor(args) {

	registerUserNotificationSettings();

	registerForLocalNotifications();

	registerForPushNotifications();

})();

function registerUserNotificationSettings() {

	if (Alloy.Globals.OS_VERSION < 8) {
		return log('Skipped: registerUserNotificationSettings (requires iOS8 or later).');
	}

	// Launches the app in the foreground
	// Will not be used for Apple Watch notifications
	var fore = Ti.App.iOS.createUserNotificationAction({
		identifier: 'FORE',
		title: 'FORE',
		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_FOREGROUND,
		destructive: false,

		// Authentication will still be required when used for lock screen notifications
		authenticationRequired: false
	});

	// Launches the app in the background
	var back = Ti.App.iOS.createUserNotificationAction({
		identifier: 'BACK',
		title: 'BACK',
		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
		destructive: false,
		authenticationRequired: false
	});

	// Launches the app in the background and is styled as destructive
	var backDestr = Ti.App.iOS.createUserNotificationAction({
		identifier: 'BACK_DESTR',
		title: 'BACK + DESTR',
		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,

		// Will display in red on lock screen and Apple Watch notifications
		destructive: true,

		authenticationRequired: false
	});

	// Launches the app in the foreground and requires the device to be unlocked
	var backAuth = Ti.App.iOS.createUserNotificationAction({
		identifier: 'BACK_AUTH',
		title: 'BACK + AUTH',
		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
		destructive: false,

		// Authentication will not be required when used for Apple Watch notifications
		authenticationRequired: true
	});

	var testCategory = Ti.App.iOS.createUserNotificationCategory({
		identifier: 'TEST_CATEGORY',

		// The first four of these actions will be used for alert and Apple Watch notifications.
		// Apple Watch will only use actions with background activationMode.
		// Actions are displayed top down and destructive actions should come last (displayed last).
		actionsForDefaultContext: [fore, back, backAuth, backDestr],

		// The first two of these actions will be used for banner and lock screen notifications.
		// Actions are displayed RTL and destructive actions should come first (displayed last).
		actionsForMinimalContext: [backDestr, fore]

	});

	var markAsRead = Ti.App.iOS.createUserNotificationAction({
		identifier: 'READ',
		title: 'Mark as Read',
		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
		destructive: false,
		authenticationRequired: false
	});

	var replyOK = Ti.App.iOS.createUserNotificationAction({
		identifier: 'OK',

		// Yes, you can use emojies (CTRL+CMD+SPACE on Mac OS X)
		title: '👍',

		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
		destructive: false,
		authenticationRequired: false
	});

	var replyNOK = Ti.App.iOS.createUserNotificationAction({
		identifier: 'NOK',
		title: '👎',
		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
		destructive: false,
		authenticationRequired: false
	});

	var deleteMessage = Ti.App.iOS.createUserNotificationAction({
		identifier: 'DELETE',
		title: 'Delete',
		activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
		destructive: true,
		authenticationRequired: false
	});

	var chatCategory = Ti.App.iOS.createUserNotificationCategory({
		identifier: 'CHAT_CATEGORY',
		actionsForDefaultContext: [replyOK, replyNOK, markAsRead, deleteMessage],

		// We could have left this one undefined as it will default to the first 2 of the aboveco
		actionsForMinimalContext: [replyOK, replyNOK]
	});

	Ti.App.iOS.registerUserNotificationSettings({
		types: [Ti.App.iOS.USER_NOTIFICATION_TYPE_ALERT, Ti.App.iOS.USER_NOTIFICATION_TYPE_BADGE, Ti.App.iOS.USER_NOTIFICATION_TYPE_SOUND],
		categories: [testCategory, chatCategory]
	});

	log('Setup: Ti.App.iOS.registerUserNotificationSettings');
}

function registerForLocalNotifications(e) {

	/**
	 * Fired when the app is opened via a local notification and the user did not
	 * select an action. Also fired when the app was in the foreground when the
	 * local notification was received. There's no flag to tell the difference.
	 * @param  {Object} e See http://docs.appcelerator.com/platform/latest/#!/api/Titanium.App.iOS-event-notification
	 */
	Ti.App.iOS.addEventListener('notification', function onNotification(e) {
		log('Ti.App.iOS:notification', e);

		if (e.category === 'CHAT_CATEGORY') {
			Alloy.Events.trigger('action', {
				id: e.userInfo.id,
				action: 'REPLY'
			});
		}
	});

	log('Setup: Ti.App.iOS:notification');

	if (Alloy.Globals.OS_VERSION < 8) {
		return log('Skipped: Ti.App.iOS:localnotificationaction (requires iOS8 or later).');
	}

	/**
	 * Fired when a user selects an action for an interactive local notification.
	 * @param  {Object} e See http://docs.appcelerator.com/platform/latest/#!/api/Titanium.App.iOS-event-localnotificationaction
	 */
	Ti.App.iOS.addEventListener('localnotificationaction', function onLocalnotificationaction(e) {
		log('Received: Ti.App.iOS:localnotificationaction', e);

		if (e.category === 'CHAT_CATEGORY') {
			Alloy.Events.trigger('action', {
				id: e.userInfo.id,
				action: e.identifier
			});
		}
	});

	log('Setup: Ti.App.iOS:localnotificationaction');
}

function registerForPushNotifications() {

	if (!Alloy.Globals.PUSH_ENABLED) {
		return log('Skipped: Ti.Network.registerForPushNotifications (no ACS key was found).');
	}

	function onSuccess(e) {
		log('Received: Ti.Network.registerForPushNotifications:success', e);

		require('ti.cloud').PushNotifications.subscribeToken({
			device_token: e.deviceToken,
			channel: 'main',
			type: 'ios'
		}, function (e) {
			log('Finished: Cloud.PushNotifications.subscribeToken', e);
		});
	}

	function onError(e) {
		log('Received: Ti.Network.registerForPushNotifications:error', e);
	}

	function onPush(e) {
		log('Received: Ti.Network.registerForPushNotifications:callback', e);
	}

	if (Alloy.Globals.OS_VERSION >= 8) {

		// Wait for user settings to be registered before registering for push notifications
		Ti.App.iOS.addEventListener('usernotificationsettings', function registerForPush() {

			// Remove event listener once registered for push notifications
			Ti.App.iOS.removeEventListener('usernotificationsettings', registerForPush);

			Ti.Network.registerForPushNotifications({
				success: onSuccess,
				error: onError,
				callback: onPush
			});
		});

		/**
		 * Fired when a user selects an action for an interactive remote notification.
		 * @param  {Object} e See http://docs.appcelerator.com/platform/latest/#!/api/Titanium.App.iOS-event-remotenotificationaction
		 */
		Ti.App.iOS.addEventListener('remotenotificationaction', function onRemotenotificationaction(e) {
			log('Ti.App.iOS:remotenotificationaction', e);

			if (e.category === 'CHAT_CATEGORY') {
				Alloy.Events.trigger('action', {
					id: e.data.id,
					action: e.identifier
				});
			}
		});

		log('Setup: Ti.App.iOS:remotenotificationaction');

	} else {
		log('Skipped: Ti.App.iOS:remotenotificationaction (requires iOS8 or later).');

		Ti.Network.registerForPushNotifications({
			types: [
				Ti.Network.NOTIFICATION_TYPE_BADGE,
				Ti.Network.NOTIFICATION_TYPE_ALERT,
				Ti.Network.NOTIFICATION_TYPE_SOUND
			],
			success: onSuccess,
			error: onError,
			callback: onPush
		});
	}
}
