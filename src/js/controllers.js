/* global angular, ionic */

angular.module( "opengarage.controllers", [ "opengarage.utils", "opengarage.cloud" ] )

	.controller( "LoginCtrl", function( $scope, $rootScope, $state, $ionicPopup, Cloud ) {
		$scope.data = {};

		$scope.submit = function() {
			if ( !$scope.data.username ) {

				// If no email is provided, throw an error
				$ionicPopup.alert( {
					template: "<p class='center'>Please enter a username to continue.</p>"
				} );
			} else if ( !$scope.data.password ) {

				// If no password is provided, throw an error
				$ionicPopup.alert( {
					template: "<p class='center'>Please enter a password to continue.</p>"
				} );
			} else {
				Cloud.login( $scope.data.username, $scope.data.password, function() {
					Cloud.sync( function() {
						$state.go( "app.controllerSelect" );
					} );
				} );
			}
		};

		$scope.skipCloud = function() {
			$state.go( "app.controllerSelect" );
		};
	} )

	.controller( "ControllerSelectCtrl", function( $scope, $state, $rootScope, $timeout, $filter, $ionicModal, $ionicHistory, Utils, Cloud ) {
		$scope.data = {
			showDelete: false
		};

		$scope.selectPhoto = Utils.selectPhoto;

		$scope.setController = function( index ) {
			Utils.setController( index );

			$ionicHistory.nextViewOptions( {
				historyRoot: true
			} );

			$state.go( "app.home" );
		};

		$scope.deleteController = function( index ) {
			if ( Utils.getControllerIndex() === index ) {
				delete $rootScope.activeController;
				Utils.storage.remove( "activeController" );
			}

			$rootScope.controllers.splice( index, 1 );
			Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
			$rootScope.$broadcast( "controllersUpdated" );
		};

		$scope.moveItem = function( item, fromIndex, toIndex ) {
			$rootScope.controllers.splice( fromIndex, 1 );
			$rootScope.controllers.splice( toIndex, 0, item );
			Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
			$rootScope.$broadcast( "controllersUpdated" );
		};

		$scope.getTime = function( timestamp ) {
			return new Date( timestamp ).toLocaleString();
		};

		$scope.changeSync = function() {
			if ( $rootScope.isSynced ) {
				Cloud.logout();
			} else {
				Cloud.requestAuth();
			}
		};
	} )

	.controller( "HistoryCtrl", function( $scope, $filter, Utils ) {
		$scope.$on( "$ionicView.beforeEnter", function() {
			Utils.getLogs( function( reply ) {
				if ( reply ) {
					var i, current, day;

					$scope.isLocal = true;

					for ( i = 0; i < reply.length; i++ ) {
						current = new Date( reply[ i ][ 0 ] * 1000 ).toDateString();

						if ( current !== day ) {
							day = current;
							reply.splice( i, 0, { isDivider: "true", day: current } );
						}
					}

					$scope.logs = reply;
				} else {
					$scope.isLocal = false;
				}
			} );
		} );
	} )

	.controller( "SettingsCtrl", function( $scope, $state, $ionicPopup, Utils ) {
		$scope.settings = {};

		$scope.changePassword = Utils.changePassword;
		$scope.restart = Utils.restartController;

		$scope.submit = function() {
			Utils.saveOptions( $scope.settings, function( reply ) {
				var text;

				if ( reply ) {
					text = "Settings saved successfully!";
					$state.go( "app.home" );
				} else {
					text = "Unable to save settings. Please check the connection to the device and try again.";
				}
				$ionicPopup.alert( {
					template: "<p class='center'>" + text + "</p>"
				} );
			} );
		};

		$scope.$on( "$ionicView.beforeEnter", function() {
			Utils.getControllerOptions( function( reply ) {
				if ( reply ) {
					$scope.isLocal = true;

					// Remove unused options to prevent accidental change
					delete reply.mod;
					delete reply.fwv;
					$scope.settings = reply;
				} else {
					$scope.isLocal = false;
				}
			}, null, true );
		} );
	} )

	.controller( "MenuCtrl", function( $scope, $rootScope, $ionicActionSheet, $ionicPopup, $ionicSideMenuDelegate, $timeout, Utils ) {

		$scope.sideMenuDraggable = Utils.getControllerIndex() === 0 ? true : false;

		$rootScope.$on( "controllerUpdated", function() {
			$scope.sideMenuDraggable = Utils.getControllerIndex() === 0 ? true : false;
		} );

		$scope.showAddController = function() {
			$ionicActionSheet.show( {
				buttons: [
					{ text: "<i class='icon ion-plus-circled'></i> Add by IP" },
					{ text: "<i class='icon ion-network'></i> Add by Blynk Token" },
					{ text: "<i class='icon ion-ios-color-wand'></i> Setup New Device" }
				],
				titleText: "Add Controller",
				cancelText: "Cancel",
				buttonClicked: function( index ) {
					if ( index === 1 ) {
						Utils.showAddBlynk();
					} else if ( index === 0 ) {
						Utils.showAddController();
					} else {
						Utils.checkNewController( function( result ) {
							if ( !result ) {
								$ionicPopup.alert( {
									template: "<p class='center'>Please first connect the power to your OpenGarage. Once complete, connect this device to the wifi network broadcast by the OpenGarage (named OG_XXXXXX) and reopen this app.</p>"
								} );
							}
						}, false );
					}
					return true;
				}
			} );
		};

		// Function to close the menu which is fired after a side menu link is clicked.
		// This is done instead of using the menu-close directive to preserve the root history stack
	    $scope.closeMenu = function() {
            $ionicSideMenuDelegate.toggleLeft( false );
	    };
	} )

	.controller( "HomeCtrl", function( $rootScope, $scope, $filter, $http, $timeout, Utils ) {
		var startInterval = function() {
				interval = setInterval( function() {
					if ( $http.pendingRequests.length < 3 ) {
						Utils.updateController().then( function() {
                            setTimeout( $scope.$apply.bind( this ), 0 );
                        } );
					}
				}, 5000 );
			},
			interval;

		$scope.toggleDoor = Utils.toggleDoor;
		$scope.selectPhoto = Utils.selectPhoto;
		$scope.currentIndex = Utils.getControllerIndex();

		$scope.changeController = function( direction ) {
			clearInterval( interval );

			var current = Utils.getControllerIndex(),
				to = current + direction;

			if ( current === -1 || to < 0 || to >= $rootScope.controllers.length ) {
				return;
			}

			$scope.currentIndex = to;
			Utils.setController( to, startInterval );
		};

		$scope.$on( "$ionicView.beforeLeave", function() {
			clearInterval( interval );
		} );

		$scope.$on( "$ionicView.beforeEnter", startInterval );

		$rootScope.$on( "controllerUpdated", function() {
			$scope.currentIndex = Utils.getControllerIndex();
			$timeout( function() {
				$scope.$apply();
			} );
		} );
	} )

	.controller( "RulesCtrl", function( $scope, $rootScope ) {
		var reset = function() {
			$scope.geo = {
				home: { direction: "open" },
				away: { direction: "close" }
			};
			$scope.set( "home" );
		};

		$scope.isAndroid = ionic.Platform.isAndroid();

		$scope.set = function( type ) {
			if ( type === "home" ) {
				$scope.current = $scope.geo.home;
			} else {
				$scope.current = $scope.geo.away;
			}
		};

		$rootScope.$on( "controllerUpdated", reset );
		reset();
	} );
