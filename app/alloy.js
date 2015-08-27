/* global ENV_PROD */

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

/**
 * Always wrap code in alloy.js in a self-executing function or any variable
 * you define here will polute the global scope. If you really want to make
 * a variable global set it as a property of global, which is a reference to
 * "this", which is the (global) scope of this CommonJS module.
 */
(function(global) {

  // This sample doesn't work with LiveView enabled`
  if (global.localeStrings) {
    alert('You should not run this app via LiveView.');
  }

  // Create a global JS-only event dispatcher by extending Backbone's Events
  // as a better alternative for Ti.App.fireEvent which crosses the bridge.
  Alloy.Events = _.extend({}, Backbone.Events);

  /**
   * Global function to format logs, emit an event that controllers/console.js
   * uses to display them in the app and log it to the console as well.
   *
   * Takes any number of and type of arguments.
   */
  global.log = function log() {

  	// Turn arguments into a true array and stringify non-strings
  	var args = Array.prototype.slice.call(arguments).map(function (arg) {
  		return (typeof arg === 'string') ? arg : JSON.stringify(arg, null, 2);
  	});

  	var message = args.join(' ');

  	// Use error-level for production or they will not show in Xcode console
  	console[ENV_PROD ? 'error' : 'info'](message);

    // Add the message to a global variable for controllers/console.js to use
    Alloy.Globals.log = (Alloy.Globals.log || '') + '[INFO] ' + message + '\n\n';

    // Trigger an event for controllers/console.js to listen to and display the log
    Alloy.Events.trigger('log');
  };

  /**
   * Global function to show an alert including an optional title other than the
   * default 'Alert' which is what you get via alert().
   *
   * @method     dialog
   * @param      {String}  message  Message to show
   * @param      {String}  title    Optional title to show (defaults to 'Alert')
   */
  global.dialog = function alert(message, title) {
  	Ti.UI.createAlertDialog({
  		title: title || 'Alert',
  		message: message
  	}).show();
  };

  // Require the CommonJS module where set up notifications to keep this file small
  require('notifications');

})(this);
