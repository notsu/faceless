// Fallback
if ( typeof Object.create !== 'function' ) {
	Object.create = function( obj ) {
		function F() {};
		F.prototype = obj;
		return new F();
	};
}

(function($ , window , document , undefined ){

	window.faceless = (function(){

		var API_VERSION = 'v2.0';

		var configs = {
			settings: {
				appId: '193207127471363',
				cookie: true,
				oauth: true,
				status: true,
				version: API_VERSION
			},
			permissions: {
				require: ['email', 'user_about_me', 'user_birthday', 'publish_actions', 'user_likes'],
				optional: []
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
				configs.permissions = permissions;
				return this;
			},

			/**
			 * Combine require and optional permission
			 * @return {String}
			 */
			conbinePermission: function () {
				var permissions = '';
				permissions += configs.permissions.require.length > 0 ? configs.permissions.require.join(',') : '';
				permissions += configs.permissions.optional.length > 0 ? configs.permissions.optional.join(',') : '';
				return permissions;
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
					console.log('initialized !!');
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
				while (this.queue.length)
				{
					var queue = this.queue.shift();
					console.log(queue);
					this[queue.method].apply(this, queue.arguments);
				}
			},

			/**
			 * Is Initialized and no any queue.
			 * @return {Boolean} true if available to execute.
			 */
			isAvailable: function () {
				return this.initialized && this.queue.length <= 0;
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

				FB.getLoginStatus(function (response) {
					if (response.status === 'connected')
					{
						_this.uid = response.authResponse.userID;
						_this.accessToken = response.authResponse.accessToken;
						_this.checkPermission(successCallback);
					}
					else if (response.status === 'not_authorized')
					{
						_this.login(successCallback, cancelCallback);
					}
					else
					{
						_this.login(successCallback, cancelCallback);
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
						_this.checkPermission(successCallback);
					}
					else
					{
						if (typeof successCallback == 'function')
						{
							cancelCallback();
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
			checkPermission: function (successCallback) {
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
							for(var key in response.data)
							{
								if (needle == response.data[key].permission && response.data[key].status == 'granted')
								{
									found = true;
									break;
								}
							}
							if (! found)
							{
								missingPermission.push (needle);
							}
						}

						if (missingPermission.length > 0)
						{
							_this.reRequestPermission (missingPermission, successCallback);
						}
						else if (typeof successCallback == 'function')
						{
							successCallback();
						}
					}
				});
				return this;
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
					_this.checkPermission(successCallback);
				},	{
						scope: missingPermission,
						auth_type: 'rerequest'
				});
				return this;
			},

			logout: function (callback) {
				if (! this.isAvailable())
				{
					this.queue.push ({
						'method': 'logout',
						'arguments': arguments
					});
					return this;
				}

				if (this.accessToken)
				{
					FB.logout(function(response) {
						if (typeof callback == 'function')
						{
							callback();
						}
					});
				}

				return this;
			},

		};

		return Object.create( app );

	})();

})( jQuery , window , document );