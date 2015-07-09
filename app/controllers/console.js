/* global log */

(function constructor(args) {

	// Show logs before this controller was created
	$.log.value = Alloy.Globals.log;

	// Fired by alloy.js when new logs are added
	Alloy.Events.on('log', function (e) {
		$.log.value = Alloy.Globals.log;
	});

})(arguments[0] || {});

function scheduleTest(e) {

	Ti.App.iOS.scheduleLocalNotification({
		alertAction: '<verb> <subject>',
		alertBody: '<message>',
		category: 'TEST_CATEGORY',
		date: new Date(Date.now() + Alloy.CFG.delay),
		sound: 'notification.caf',
		userInfo: {
			'<key>': '<value>'
		}
	});

	log('Test: Scheduled local notification. You have ' + (Alloy.CFG.delay / 1000) + ' seconds to move the app to the background or lock your phone.');
}
