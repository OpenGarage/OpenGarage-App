/* global angular */

// OpenGarage
// Controllers are found in controllers.js and utilities are located in utils.js
angular.module( "opengarage", [ "ionic", "opengarage.controllers", "opengarage.utils" ] )
	.run( function( $state, $ionicPlatform, $ionicScrollDelegate, $ionicHistory, $location, $document, $window, $rootScope, $ionicLoading, $ionicPopup, $timeout, Utils ) {

		// Ready function fires when the DOM is ready and after deviceready event is fired if Cordova is being used
		$ionicPlatform.ready( function() {

			// Map inAppBrowser to rootScope
			$rootScope.open = window.open;

			// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
			// for form inputs)
			if ( window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard && window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar ) {
				window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar( true );
			}
			if ( window.StatusBar ) {

				// Use white text/icons on the status bar
		        window.StatusBar.styleLightContent();

		        //Change the status bar color to match the header
                window.StatusBar.backgroundColorByHexString( "#444" );

		        // Scroll to the top of the page when the status bar is tapped
				angular.element( $window ).on( "statusTap", function() {
					$ionicScrollDelegate.scrollTop();
		        } );

				if ( window.Intercom ) {
			        window.Intercom( "onShow", function() {
						window.StatusBar.hide();
			        } );
			        window.Intercom( "onHide", function() {
				        window.StatusBar.show();
			        } );
			    }
			}

		    // Hide the splash screen after 500ms of the app being ready
		    $timeout( function() {
		        try {
		            navigator.splashscreen.hide();
		        } catch ( err ) {}
		    }, 500 );
		} );

		// Define version, build number and debug state
		$rootScope.version = window.appVersion;

	    // Define the offline status on the rootScope
	    $rootScope.networkStatus = $window.navigator.onLine ? "up" : "down";

	    // Define total loading requests
	    $rootScope.loadingCount = 0;

	    // Initialize controllers array
	    $rootScope.controllers = [];

		// Automatically show a loading message on any AJAX request
		$rootScope.$on( "loading:show", function( e, data ) {

			$rootScope.loadingCount++;
			$rootScope.canceller = data.canceller.resolve;
			$ionicLoading.show( {
				template: "<ion-spinner></ion-spinner><br>One moment please<br><button class='button white icon-left ion-ios-close-outline button-clear' ng-click='$root.canceller()'>Cancel</button>"
			} );
		} );

		// Automatically hide the loading message after an AJAX request
		$rootScope.$on( "loading:hide", function() {

			$rootScope.loadingCount--;
			if ( $rootScope.loadingCount <= 0 ) {
				$rootScope.loadingCount = 0;
				$ionicLoading.hide();
			}
		} );

		// Keep the page title locked as the app name
		$rootScope.$on( "$ionicView.afterEnter", function() {
			$document[ 0 ].title = "OpenGarage";
		} );

		angular.element( $window ).on( "online", Utils.networkUp ).on( "offline", Utils.networkDown );

		// Handle loading of the first page
		var firstLoadHandler = $rootScope.$on( "$stateChangeStart", function( event ) {

			// Unbind event handler so this check is only performed on the first app load
		    firstLoadHandler();

		    // Prevent any page change from occurring
	        event.preventDefault();

		    Utils.storage.get( [ "activeController", "controllers" ], function( data ) {

				try {
					$rootScope.controllers = JSON.parse( data.controllers );
					data.activeController = JSON.parse( data.activeController );
				} catch ( err ) {}

				// Restore the active controller, if available
		        if ( data.activeController && typeof data.activeController === "object" ) {

					Utils.setController( data.activeController );

					// If a user object is cached, proceed to load the app while updating user object in the background
					$state.go( "app.home" );
		        } else {
					$state.go( "app.controllerSelect" );
		        }
		    } );
		} );

		// Resize the main content view to fit when the window changes size
		angular.element( window ).on( "resize", function() {
			$rootScope.$broadcast( "window:resize" );
			if ( window.innerWidth > 768 ) {
				angular.element( "#mainContent" ).width( window.innerWidth - 275 );
			}
		} );
	} )

	.config( function( $stateProvider, $urlRouterProvider, $httpProvider, $compileProvider, $ionicConfigProvider ) {

		if ( /MSIE\s|Trident\/|Edge\//.test( window.navigator.userAgent ) ) {

			// Change the default spinner for IE to android which has JS based animation
			$ionicConfigProvider.platform.default.spinner.icon( "android" );
		}

		// Change the back text to always say 'Back'
		$ionicConfigProvider.backButton.previousTitleText( false ).text( "Back" );

		// Use native scrolling for FireFox
		if ( /Firefox/.test( navigator.userAgent ) ) {
			$ionicConfigProvider.scrolling.jsScrolling( false );
		}

		// Modify Ionic's allowed href protocols to allow Firefox, Blackberry, iOS and Chrome support
		$compileProvider.aHrefSanitizationWhitelist( /^\s*(https?|ftp|mailto|chrome-extension|app|local|file):/ );

		// Modify Ionic's allowed image source protocols
		$compileProvider.imgSrcSanitizationWhitelist( /^\s*(https?|ftp|file|content|blob|ms-appx|x-wmapp0|chrome-extension|app|local):|data:image\// );

		// Define all available routes and their associated controllers
		$stateProvider

			// Used as the parent route after authentication is complete allowing the same header
			// and side menu's to be used throughout all child views
			.state( "app", {
				url: "/app",
				abstract: true,
				templateUrl: "templates/menu.html",
				controller: "MenuCtrl"
			} )

			.state( "app.home", {
				url: "/home",
				views: {
					menuContent: {
						templateUrl: "templates/home.html",
						controller: "HomeCtrl"
					}
				},
				resolve: {
					checkValid: function( $timeout, $q, $state, $rootScope, $filter, Utils ) {
						var total = $rootScope.controllers.length,
							filterFilter = $filter( "filter" ),
							invalidOrg = ( $rootScope.activeController && filterFilter( $rootScope.controllers, { "mac": $rootScope.activeController.mac } ).length === 0 ) ? true : false;

						if ( !$rootScope.activeController && total === 1 ) {
							Utils.setController( $rootScope.controllers[ 0 ] );
							return;
						}

						if ( !$rootScope.activeController || invalidOrg ) {

							delete $rootScope.activeController;
							Utils.storage.remove( "activeController" );

							// If the active controller is not found in the controller list, show the select controller screen
							$timeout( function() {
								$state.go( "app.controllerSelect" );
							} );

							return $q.reject();
						}
					}
				}
			} )

			.state( "app.controllerSelect", {
				url: "/controllerSelect",
				views: {
					menuContent: {
						templateUrl: "templates/controllerSelect.html",
						controller: "ControllerSelectCtrl"
					}
				}
			} )

			.state( "app.settings", {
				url: "/settings",
				views: {
					menuContent: {
						templateUrl: "templates/settings.html",
						controller: "SettingsCtrl"
					}
				},
				resolve: {
					checkValid: function( $rootScope, $q ) {
						if ( !$rootScope.activeController ) {
							return $q.reject();
						}
					}
				}
			} )

			.state( "app.help", {
				url: "/help",
				views: {
					menuContent: {
						templateUrl: "templates/help.html",
						controller: "HelpCtrl"
					}
				}
			} )

			// Defines the otherwise route which will redirect any invalid URL back to the start page
			.state( "otherwise", {
				url: "*path",
				template: "",
				controller: function( $state, $rootScope ) {

					if ( $rootScope.activeController ) {
						$state.go( "app.home" );
					} else {
						$state.go( "app.controllerSelect" );
					}
				}
			} );

		// Add an HTTP interceptor
		$httpProvider.interceptors.push( function( $rootScope, $q, $injector, Utils ) {
			return {
				request: function( config ) {

					// When an AJAX request to the API is started, fire an event to show a loading message
					if ( $rootScope.activeController && config.url.indexOf( $rootScope.activeController.ip ) !== -1 && !config.suppressLoader ) {

						// Change timeout to a promise we can cancel
						var canceller = $q.defer();

						// Set the timeout to the canceller promise
						config.timeout = canceller.promise;

						// Set the current retry count to 0
						if ( typeof config.retryCount !== "number" ) {
							config.retryCount = 0;
						}

						$rootScope.$broadcast( "loading:show", { canceller: canceller } );
					}

					return config;
				},
				response: function( response ) {

					// If the request is to the API, broadcast a hide loading message
					if ( $rootScope.activeController && response.config.url.indexOf( $rootScope.activeController.ip ) !== -1 ) {

						if ( !response.config.suppressLoader ) {
							$rootScope.$broadcast( "loading:hide" );
						}
						Utils.networkUp();
					}

					return response;
				},
				responseError: function( error ) {

					var isAPI = $rootScope.activeController && error.config.url.indexOf( $rootScope.activeController.ip ) !== -1 ? true : false;

					// If the timeout value is an object and is resolved, mark request as user canceled
					if ( error.config.timeout && error.config.timeout.$$state && error.config.timeout.$$state.status === 1 ) {
						error.canceled = true;
					}

					// If the request is to the API, broadcast a hide loading message
					if ( isAPI ) {
						if ( !error.config.suppressLoader ) {
							$rootScope.$broadcast( "loading:hide" );
						}

						if ( error.status > 0 ) {
							Utils.networkUp();
						}

						// If the request returns a 401, redirect to the login page
						if ( error.status === 401 ) {
							Utils.logout();
							return $q.reject( error );
						}
					}

					// If the request timed out and is not user canceled, retry the request up to three times
					if ( error.status <= 0 && !error.canceled ) {
						if ( error.config.retryCount < 3 ) {
							var $http = $injector.get( "$http" );

							error.config.retryCount++;

							// Return the new promise object
							return $http( error.config );
						} else {

							// After three timeouts, assume the network is down
							error.retryFailed = true;
							error.canceled = true;

							if ( isAPI ) {
								Utils.networkDown();
							}
							return $q.reject( error );
						}
					}

					return $q.reject( error );
				}
			};
		} );

		// Inform Ionic we want to cache forward views
		$ionicConfigProvider.views.forwardCache( true );
	} );
