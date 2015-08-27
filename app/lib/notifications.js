/* global log */

// Turns the string 8.4.1 into 8 to use in the code
var OS_VERSION = parseInt(Ti.Platform.version.split('.')[0], 10);

// Only enable code if the acs-api-key is set in tiapp.xml
var PUSH_ENABLED = !!Ti.App.Properties.getString('acs-api-key');

/**
 * Self-executing function containing all code that is executed when this module
 * is first required, apart from dependencies and variables declared above. Just
 * for readability, much like a class constructor.
 */
(function constructor(args) {

	// Register for push notifications first because on iOS 8+ it will wait for
	// the usernotificationsettings-event to actual do the registration.
	registerForPushNotifications();

	registerUserNotificationSettings();

	registerForLocalNotifications();
	

})();

/**
 * Register both local and push notification settings
 */
function registerUserNotificationSettings() {

	// Only for iOS 8 and up
	if (OS_VERSION < 8) {
		return log('Skipped: registerUserNotificationSettings (requires iOS8 or later).');
	}

	/**
	 * Actions for the TEST_CATEGORY
	 */

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

	/**
	 * Actions for the CHAT_CATEGORY
	 */

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

	/// Register the notification types and categories
	Ti.App.iOS.registerUserNotificationSettings({
		types: [Ti.App.iOS.USER_NOTIFICATION_TYPE_ALERT, Ti.App.iOS.USER_NOTIFICATION_TYPE_BADGE, Ti.App.iOS.USER_NOTIFICATION_TYPE_SOUND],
		categories: [testCategory, chatCategory]
	});

	log('Setup: Ti.App.iOS.registerUserNotificationSettings');
}

/**
 * Register for local notifications
 *
 * See http://docs.appcelerator.com/platform/latest/#!/guide/iOS_Local_Notifications-section-40929226_iOSLocalNotifications-RegisterforLocalNotifications
 */
function registerForLocalNotifications() {

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

	// Local notification actions are for iOS 8 and later only
	if (OS_VERSION < 8) {
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

/**
 * Register for push notifications
 *
 * See http://docs.appcelerator.com/platform/latest/#!/guide/Subscribing_to_push_notifications
 */
function registerForPushNotifications() {

	// Only if push is enabled (see top of file)
	if (!PUSH_ENABLED) {
		return log('Skipped: Ti.Network.registerForPushNotifications (no ACS key was found).');
	}

	/**
	 * Event handlers for the 7 < iOS >= 8 listeners
	 */

	function onSuccess(e) {
		log('Received: Ti.Network.registerForPushNotifications:success', e);

		// Subscribe to a channel on Arrow
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

	if (OS_VERSION >= 8) {

		// Wait for user settings to be registered before registering for push notifications
		Ti.App.iOS.addEventListener('usernotificationsettings', function registerForPush(e) {

			// Remove event listener once registered for push notifications
			Ti.App.iOS.removeEventListener('usernotificationsettings', registerForPush);

			log('Ti.App.iOS:usernotificationsettings', e);

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

		// Before iOS8 the types we needed to be set here
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
