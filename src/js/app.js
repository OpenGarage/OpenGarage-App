/* global angular, google */

// OpenGarage
// Controllers are found in controllers.js and utilities are located in utils.js
angular.module( "opengarage", [ "ionic", "uiCropper", "opengarage.controllers", "opengarage.utils", "opengarage.cloud" ] )
	.run( function( $state, $ionicPlatform, $ionicScrollDelegate, $ionicHistory, $location, $document, $window, $rootScope, $filter, $ionicLoading, $ionicPopup, $timeout, Utils, Cloud ) {

		// Ready function fires when the DOM is ready and after deviceready event is fired if Cordova is being used
		$ionicPlatform.ready( function() {

			// Map inAppBrowser to rootScope
			$rootScope.open = function( url ) {
				window.open( url, "_blank", "toolbarposition=top" );
			};

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
			}

			if ( window.geofence ) {
				$rootScope.hasGeofence = true;

				$rootScope.startGeofence = function( callback ) {
					window.geofence.initialize().then( function() {
						callback( true );
					}, function() {
						callback( false );
					} );
				};

				window.geofence.getWatched( function( fences ) {
					$rootScope.geoFences = JSON.parse( fences );
				} );

				var handleGeofence = function( geofences ) {
					if ( geofences ) {

						// Allow handler to process notification click event as well
						if ( geofences.notification ) {
							geofences = [ geofences ];
						}

						$rootScope.$apply( function() {
							geofences.forEach( function( geo ) {
								var controller = $filter( "filter" )( $rootScope.controllers, { "mac": geo.notification.data.controller } );

								if ( controller &&
									( geo.notification.id === "open" && controller.door === 0 ) &&
									( geo.notification.id === "close" && controller.door === 1 ) ) {
										Utils.toggleDoor( controller.auth );
								}
							} );
						} );
					}
				};

				window.geofence.onTransitionReceived = handleGeofence;
				window.geofence.onNotificationClicked = handleGeofence;
			}

		    // Hide the splash screen after 500ms of the app being ready
		    $timeout( function() {
		        try {
		            navigator.splashscreen.hide();
		        } catch ( err ) {}
		    }, 500 );
		} );

		// Define connected state of current controller
		$rootScope.connected = false;

		// Define version, build number and debug state
		$rootScope.version = window.appVersion;

	    // Define total loading requests
	    $rootScope.loadingCount = 0;

	    // Initialize controllers array
	    $rootScope.controllers = [];

		// Automatically show a loading message on any AJAX request
		$rootScope.$on( "loading:show", function( e, data ) {

			$rootScope.loadingCount++;
			$rootScope.canceller = data ? data.canceller.resolve : angular.noop;
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

		angular.element( $document ).on( "resume", function() {
			$timeout( function() {
				Utils.checkNewController();
				Cloud.sync();
			}, 100 );
		} );

		// Handle loading of the first page
		var firstLoadHandler = $rootScope.$on( "$stateChangeStart", function( event ) {

			// Unbind event handler so this check is only performed on the first app load
		    firstLoadHandler();

		    // Prevent any page change from occurring
	        event.preventDefault();

		    Utils.storage.get( [ "activeController", "controllers", "cloudToken" ], function( data ) {

				try {
					$rootScope.controllers = JSON.parse( data.controllers );
					$rootScope.activeController = JSON.parse( data.activeController );
				} catch ( err ) {}

				if ( !$rootScope.controllers ) {
					$rootScope.controllers = [];
				}

				Cloud.sync();

				// Restore the active controller, if available
		        if ( $rootScope.activeController && typeof $rootScope.activeController === "object" ) {

					// If a user object is cached, proceed to load the app while updating user object in the background
					$state.go( "app.home" );

					Utils.updateController();
		        } else {
					if ( $rootScope.controllers.length || data.cloudToken ) {
						$state.go( "app.controllerSelect" );
					} else {
						$state.go( "login" );
					}
		        }
		    } );

		    Utils.checkNewController();
		} );

		// Resize the main content view to fit when the window changes size
		angular.element( window ).on( "resize", function() {
			$rootScope.$broadcast( "window:resize" );
			var content = document.getElementById( "mainContent" );
			if ( content && window.innerWidth > 768 ) {
				content.width = window.innerWidth - 275;
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
			.state( "login", {
				url: "/login",
				templateUrl: "templates/login.html",
				controller: "LoginCtrl"
			} )

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
							$rootScope.activeController = $rootScope.controllers[ 0 ];
							Utils.updateController();
							Utils.storage.set( { activeController: JSON.stringify( $rootScope.activeController ) } );
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

			.state( "app.rules", {
				url: "/rules",
				views: {
					menuContent: {
						templateUrl: "templates/rules.html",
						controller: "RulesCtrl"
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

			.state( "app.history", {
				url: "/history",
				views: {
					menuContent: {
						templateUrl: "templates/history.html",
						controller: "HistoryCtrl"
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
						templateUrl: "templates/help.html"
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
		$httpProvider.interceptors.push( function( $rootScope, $q, $injector ) {
			return {
				request: function( config ) {

					// When an AJAX request to the controller is started, fire an event to show a loading message
					if ( !config.suppressLoader ) {

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

					// If the request is to the controller, broadcast a hide loading message
					if ( !response.config.suppressLoader ) {
						$rootScope.$broadcast( "loading:hide" );
					}

					return response;
				},
				responseError: function( error ) {

					// If the timeout value is an object and is resolved, mark request as user canceled
					if ( error.config.timeout && error.config.timeout.$$state && error.config.timeout.$$state.status === 1 ) {
						error.canceled = true;
					}

					if ( !error.config.suppressLoader ) {
						$rootScope.$broadcast( "loading:hide" );
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

							return $q.reject( error );
						}
					}

					return $q.reject( error );
				}
			};
		} );

		// Inform Ionic we want to cache forward views
		$ionicConfigProvider.views.forwardCache( true );
	} )

	.filter( "unique", function() {
		return function( items, filterOn ) {
			if ( filterOn === false ) {
				return items;
			}

			if ( ( filterOn || angular.isUndefined( filterOn ) ) && angular.isArray( items ) ) {
				var newItems = [],
					extractValueToCompare = function( item ) {
						if ( angular.isObject( item ) && angular.isString( filterOn ) ) {
							return item[ filterOn ];
						} else {
							return item;
						}
					};

				angular.forEach( items, function( item ) {
					var isDuplicate = false;

					for ( var i = 0; i < newItems.length; i++ ) {
						if ( angular.equals( extractValueToCompare( newItems[ i ] ), extractValueToCompare( item ) ) ) {
							isDuplicate = true;
							break;
						}
					}
					if ( !isDuplicate ) {
						newItems.push( item );
					}
				} );
				items = newItems;
			}
		return items;
		};
	} )

	.directive( "geoRuleSetup", function( $rootScope, $filter ) {
		return {
			restrict: "E",
			replace: true,
			scope: {
				rule: "="
			},
			templateUrl: "templates/geoRuleSetup.html",
			link: function( scope, element ) {
				var map, marker, circle;

				scope.updateRule = function() {
					$rootScope.startGeofence( function() {
						window.geofence.addOrUpdate( {
							id: scope.rule.direction,
							latitude: scope.rule.start.lat,
							longitude: scope.rule.start.lng,
							radius: scope.rule.radius,
							transitionType: scope.rule.direction === "open" ? 1 : 2,
							notification: {
								title: "OpenGarage",
								text: "Trying to " + scope.rule.direction + " the garage door...",
								openAppOnClick: true,
								data: { controller: $rootScope.activeController.mac }
							}
						}, function() {
							window.geofence.getWatched( function( fences ) {
								$rootScope.geoFences = JSON.parse( fences );
							} );
						} );
					} );
				};

				scope.updateMarker = function() {
					if ( marker ) {
						marker.setMap( null );
					}

					marker = new google.maps.Marker( {
						position: scope.rule.start,
						map: map
					} );

					scope.updateRule();
				};

				scope.updateRadius = function() {
					if ( circle ) {
						circle.setMap( null );
					}

					circle = new google.maps.Circle( {
						strokeColor: "#FF0000",
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: "#FF0000",
						fillOpacity: 0.35,
						map: map,
						center: scope.rule.start,
						radius: parseInt( scope.rule.radius )
					} );

					scope.updateRule();
				};

				scope.updateMap = function() {
					if ( !scope.rule.enable ) {
						window.geofence.remove( scope.rule.direction, function() {
							window.geofence.getWatched( function( fences ) {
								$rootScope.geoFences = JSON.parse( fences );
							} );
						} );
						return;
					}

					setTimeout( function() {
						map = new google.maps.Map( element[ 0 ].querySelectorAll( ".map" )[ 0 ], {
							zoom: 16,
							streetViewControl: false,
							mapTypeControl: false,
							center: scope.rule.start
						} );

						google.maps.event.addListener( map, "click", function( e ) {
							scope.rule.start = { lat: e.latLng.lat(), lng: e.latLng.lng() };
							scope.updateMarker();
							scope.updateRadius();
						} );

						scope.updateMarker();
						scope.updateRadius();
					}, 100 );
				};

				scope.$watch( "rule", function() {
					var currentRule = $filter( "filter" )( $rootScope.geoFences, { "id": scope.rule.direction } )[ 0 ];

					if ( currentRule ) {
						scope.rule.radius = currentRule.radius;
						scope.rule.start = { lat: currentRule.latitude, lng: currentRule.longitude };
						scope.rule.enable = true;
						scope.updateMap();
					} else {
						scope.rule.radius = scope.rule.radius || 500;
						scope.rule.start = scope.rule.start || { lat: 30.296519, lng: -97.730185 };
						scope.rule.enable = scope.rule.enable || false;

						navigator.geolocation.getCurrentPosition( function( position ) {
							scope.rule.start = { lat: position.coords.latitude, lng: position.coords.longitude };
							scope.updateMap();
						}, function() {
							scope.updateMap();
						}, { timeout: 10000 } );
					}
				} );
			}
		};
	} );
