// The contents of this file will be executed before any of
// your view controllers are ever executed, including the index.
// You have access to all functionality on the `Alloy` namespace.
//
// This is a great place to do any initialization for your app
// or create any global variables/functions that you'd like to
// make available throughout your app. You can easily make things
// accessible globally by attaching them to the `Alloy.Globals`
// object. For example:
//
// Alloy.Globals.someGlobalFunction = function(){};

(function(global) {

  if (global.localeStrings) {
    // alert('You should not run this app via LiveView.');
  }

  Alloy.Globals.OS_VERSION = parseInt(Ti.Platform.version.split('.')[0], 10);
  Alloy.Globals.PUSH_ENABLED = !!Ti.App.Properties.getString('acs-api-key');

  Alloy.Events = _.extend({}, Backbone.Events);

  global.log = function log() {

  	// accept multiple arguments and stringify non-strings
  	var args = Array.prototype.slice.call(arguments).map(function (arg) {
  		return (typeof arg === 'string') ? arg : JSON.stringify(arg, null, 2);
  	});

  	var message = args.join(' ');

  	// We use error-level for production or else they will not show in Xcode console
  	console[ENV_PROD ? 'error' : 'info'](message);

    Alloy.Globals.log = (Alloy.Globals.log || '') + '[INFO] ' + message + '\n\n';

    Alloy.Events.trigger('log');
  };

  global.dialog = function alert(message, title) {
  	Ti.UI.createAlertDialog({
  		title: title || 'Alert',
  		message: message
  	}).show();
  };

  require('notifications');

})(this);
