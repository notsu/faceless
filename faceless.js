// Fallback
if ( typeof Object.create !== 'function' ) {
	Object.create = function( obj ) {
		function F() {};
		F.prototype = obj;
		return new F();
	};
}

var faceless = (function($ , window , document , undefined ){

	return (function(){

		var API_VERSION = 'v2.0';

		var appId = {
			default: '193207127471363',
			dogilike: '387503985624',
		};

		var configs = {
			settings: {
				appId: appId.default,
				cookie: true,
				oauth: true,
				status: true,
				version: API_VERSION
			},
			permissions: {
				require: ['email', 'user_about_me', 'user_birthday', 'publish_actions'],
				optional: ['user_likes']
			}
		};

		var app = {

			/**
			 * Initialize Flag.
			 * @type {Boolean}
			 */
			initialized: false,

			/**
			 * User's ID of facebook connected.
			 * @type {Number}
			 */
			uid: 0,

			/**
			 * Access Token for use along with app.
			 * @type {String}
			 */
			accessToken: null,

			/**
			 * Queue to run after FB is initialized.
			 * @type {Object}
			 */
			queue: [],

			/**
			 * Default version for central control.
			 * @type {String}
			 */
			defaultVersion: API_VERSION,

			/**
			 * Pre-defined ID which can called by name space
			 * @type {[type]}
			 */
			appId: appId,

			/**
			 * Facebook Configuration
			 * @param  {Object} settings which you want to replaced.
			 * @return {Object}          return this for chain object.
			 */
			setting: function (settings) {
				configs.settings = $.extend(configs.settings, settings);
				return this;
			},

			/**
			 * Facebook Permission
			 * @param  {String} permissions which you want to replaced.
			 * @return {Object}             return this for chain object.
			 */
			permission: function (permissions) {
				configs.permissions = {
					require: this.splitPermission(permissions.require),
					optional: this.splitPermission(permissions.optional)
				};
				return this;
			},

			/**
			 * Combine require and optional permission
			 * @return {String}
			 */
			conbinePermission: function () {
				var permissions = '';
				// TODO: combine separate
				permissions += configs.permissions.require.length > 0 ? configs.permissions.require.join(',') : '';
				permissions += configs.permissions.optional.length > 0 ? configs.permissions.optional.join(',') : '';
				return permissions;
			},

			/**
			 * Split require and optional permission
			 * @return {Array}
			 */
			splitPermission: function (permissionString) {
				return typeof permissionString == 'string' && permissionString.length > 0 ? permissionString.replace(/ /g, '').split(',') : 0;
			},

			/**
			 * Facebook Initialize
			 * @param  {Function} callback function which you want to call after init
			 * @return {Object}             return this for chain object.
			 */
			init: function(callback){
				var _this = this;

				window.fbAsyncInit = function() {
					FB.init(configs.settings);
					_this.initialized = true;
					_this.executeQueue();

					if (typeof callback == 'function')
					{
						callback();
					}
				};

				(function(d, s, id){
					var js, fjs = d.getElementsByTagName(s)[0];
					if (d.getElementById(id)) {return;}
					js = d.createElement(s); js.id = id;
					js.src = "//connect.facebook.net/en_US/sdk.js#version="+API_VERSION+"&appId="+configs.settings.appId;
					fjs.parentNode.insertBefore(js, fjs);
				}(document, 'script', 'facebook-jssdk'));

				return this;
			},

			/**
			 * Execute queue which waiting for initialize.
			 * @return {null}
			 */
			executeQueue: function () {
				if (this.queue.length > 0)
				{
					while (this.queue.length)
					{
						var queue = this.queue.shift();
						if (queue.method.indexOf('.') > 0) {
							var queueSplit = queue.method.split('.');
							this[queueSplit[0]][queueSplit[1]].apply(this[queueSplit[0]], queue.arguments);
						} else {
							this[queue.method].apply(this, queue.arguments);
						}
					}
				}
			},

			/**
			 * Is Initialized and no any queue.
			 * @return {Boolean} true if available to execute.
			 */
			isAvailable: function () {
				return this.initialized;
			},

			/**
			 * Authenticate with Facebook
			 * @param  {Function} successCallback callback if authenticate completed.
			 * @param  {Function} cancelCallback  callback if authenticate is failed or canceled.
			 * @return {Object}                 return this
			 */
			auth: function(successCallback, cancelCallback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'auth',
						'arguments': arguments
					});
					return this;
				}

				var _this = this;

				this.getLoginStatus(function (response) {
					_this.uid = response.authResponse.userID;
					_this.accessToken = response.authResponse.accessToken;
					_this.checkPermission(function () {
						successCallback(response);
					});
				}, function (response) {
					_this.login(function () {
						successCallback(response);
					}, function () {
						cancelCallback(response);
					});
				}, function (response) {
					_this.login(function () {
						successCallback(response);
					}, function () {
						cancelCallback(response);
					});
				});

				return this;
			},

			/**
			 * Check login status of Facebook account.
			 * @param  {Function} connectedCallback     Called when it's connected.
			 * @param  {Function} notAuthorizedCallback Called when it's not authorized.
			 * @param  {Function} failedCallback        Called when it's not login.
			 * @return {Object}                       this
			 */
			getLoginStatus: function (connectedCallback, notAuthorizedCallback, failedCallback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'getLoginStatus',
						'arguments': arguments
					});
					return this;
				}

				var _this = this;

				FB.getLoginStatus(function(response) {

					if (response.status === 'connected') {
						if (typeof connectedCallback == 'function')
						{
							connectedCallback(response);
						}
					} else if (response.status === 'not_authorized') {
						if (typeof notAuthorizedCallback == 'function')
						{
							notAuthorizedCallback(response);
						}
					} else {
						if (typeof failedCallback == 'function')
						{
							failedCallback(response);
						}
					}
				});

				return this;
			},

			/**
			 * Facebook Login
			 * @param  {Function} successCallback callback function if authenticated.
			 * @param  {Function} cancelCallback  callback function if it is failed or canceled.
			 * @return {this}                 return this
			 */
			login: function (successCallback, cancelCallback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'login',
						'arguments': arguments
					});
					return this;
				}

				var _this = this;

				FB.login(function(response) {
					if (response.authResponse)
					{
						_this.checkPermission(function () {
							successCallback(response);
						});
					}
					else
					{
						if (typeof successCallback == 'function')
						{
							cancelCallback(response);
						}
					}
				}, {scope: this.conbinePermission()});

				return this;
			},

			/**
			 * Check which permission is missing
			 * @param  {Function} successCallback callback function if success (only required permission)
			 * @return {Object}                 return this
			 */
			checkPermission: function (successCallback, failedCallback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'checkPermission',
						'arguments': arguments
					});
					return this;
				}

				var _this = this;

				FB.api('/me/permissions',	function (response) {
					if (response && !response.error)
					{
						var needle = '';
						var found = false;
						var missingPermission = [];
						for(var keyConfig in configs.permissions.require)
						{
							found = false;
							needle = configs.permissions.require[keyConfig];
							found = _this.hasPermission(needle, response);

							if (! found)
							{
								missingPermission.push (needle);
							}
						}

						if (missingPermission.length > 0)
						{
							_this.reRequestPermission (missingPermission, function () {
								successCallback(response);
							});
						}
						else if (typeof successCallback == 'function')
						{
							successCallback(response);
						}
					}
				});
				return this;
			},

			/**
			 * Has permission ?
			 * @param  {String}  needle   Permission's name
			 * @param  {Object}  response Haystack
			 * @return {Boolean}          Is it has?
			 */
			hasPermission: function (needle, response) {
				for(var key in response.data)
				{
					if (needle == response.data[key].permission && response.data[key].status == 'granted')
					{
						return true;
					}
				}

				return false;
			},

			/**
			 * Re-request authenticate permission for required permission only.
			 * @param  {Array} missingPermission array of permission which required but missing.
			 * @param  {Function} successCallback   callback function if it is success.
			 * @return {Object}                   return this
			 */
			reRequestPermission: function (missingPermission, successCallback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'reRequestPermission',
						'arguments': arguments
					});
					return this;
				}

				missingPermission = missingPermission.join(',');
				var _this = this;
				FB.login(function(response) {
					_this.checkPermission(function () {
						successCallback(response);
					});
				},	{
						scope: missingPermission,
						auth_type: 'rerequest'
				});
				return this;
			},

			/**
			 * Is liked that page?
			 * @param  {String}  pageId          Page's ID
			 * @param  {Function}  likedCallback   Success callback function
			 * @param  {Function}  notLikeCallback Failed callback function
			 * @return {Object}                 this
			 */
			isLikedPage: function (pageId, likedCallback, notLikeCallback) {
				this.api ('me/likes/'+pageId, function (response) {
					if (response && !response.error && response.data.length > 0)
					{
						likedCallback(response);
					}
					else
					{
						notLikeCallback(response);
					}
				});

				return this;
			},

			/**
			 * Facebook's API Foundation
			 * @param  {String}   path     Path of API call
			 * @param  {String}   method   Header's method
			 * @param  {Object}   params   Parameters
			 * @param  {Function} callback Function which called after recieved API result
			 * @return {Object}            this
			 */
			api: function (path, method, params, callback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'api',
						'arguments': arguments
					});
					return this;
				}

				FB.api(path, method, params, callback);

				return this;
			},

			/**
			 * Facebook Dialogs
			 * @param  {Object}   params   Parameters
			 * @param  {Function} callback Callback function
			 * @return {Object}            this
			 */
			ui: function (params, callback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'api',
						'arguments': arguments
					});
					return this;
				}

				FB.ui(params, callback);

				return this;
			},

			/**
			 * Logout from Facebook
			 * @param  {Function} callback callback function called after logout.
			 * @return {Object}            this
			 */
			logout: function (callback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'logout',
						'arguments': arguments
					});
					return this;
				}

				var _this = this;

				if (this.accessToken)
				{
					FB.logout(function(response) {
						if (typeof callback == 'function')
						{
							callback(response);
						}
					});
				}

				return this;
			},

			/**
			 * Facebook Event
			 * @type {Object}
			 */
			Event: {

				/**
				 * Event Subscription
				 * @param  {String}   event    Event's name
				 * @param  {Function} callback Callback function
				 * @return {Object}            this
				 */
				subscribe: function (event, callback) {
					if (! faceless.isAvailable())
					{
						faceless.queue.push ({
							'method': 'Event.subscribe',
							'arguments': arguments
						});
						return this;
					}

					FB.Event.subscribe(event, callback);

					return this;
				},

				/**
				 * Event Unsubscription
				 * @param  {String}   event    Event's name
				 * @param  {Function} callback Callback function
				 * @return {Object}            this
				 */
				unsubscribe: function (event, callback) {
					if (! faceless.isAvailable())
					{
						faceless.queue.push ({
							'method': 'Event.unsubscribe',
							'arguments': arguments
						});
						return this;
					}

					FB.Event.unsubscribe(event, callback);

					return this;
				}
			}

		};

		return Object.create( app );

	})();

})( jQuery , window , document );