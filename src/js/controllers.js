/* global angular */

angular.module( "opengarage.controllers", [ "opengarage.utils", "opengarage.cloud" ] )

	.controller( "ControllerSelectCtrl", function( $scope, $state, $rootScope, $timeout, $filter, $ionicModal, $ionicHistory, Utils, Cloud ) {
		$scope.data = {
			showDelete: false,
			image: false,
			cropped: false,
			index: false
		};

		var fileInput = angular.element( document.getElementById( "photoUpload" ) );

		$ionicModal.fromTemplateUrl( "templates/crop.html", {
			scope: $scope
		} ).then( function( modal ) {
			$scope.crop = modal;
		} );

		$scope.hasCamera = navigator.camera && navigator.camera.getPicture ? true : false;

		$scope.setController = function( index ) {
			$rootScope.activeController = $rootScope.controllers[ index ];
			$rootScope.connected = false;
			Utils.updateController();
			Utils.storage.set( { activeController: JSON.stringify( $rootScope.activeController ) } );

			$ionicHistory.nextViewOptions( {
				historyRoot: true
			} );

			$state.go( "app.home" );
		};

		$scope.deleteController = function( index ) {
			if ( $rootScope.controllers.indexOf( ( $filter( "filter" )( $rootScope.controllers, { "mac": $rootScope.activeController.mac } ) || [] )[ 0 ] ) === index ) {
				delete $rootScope.activeController;
				Utils.storage.remove( "activeController" );
			}

			$rootScope.controllers.splice( index, 1 );
			Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
		};

		$scope.moveItem = function( item, fromIndex, toIndex ) {
			$rootScope.controllers.splice( fromIndex, 1 );
			$rootScope.controllers.splice( toIndex, 0, item );
			Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
		};

		$scope.getTime = function( timestamp ) {
			return new Date( timestamp ).toLocaleString();
		};

		$scope.selectPhoto = function( $event, index ) {
			$event.stopPropagation();

			if ( $scope.data.showDelete ) {
				if ( $rootScope.controllers.indexOf( ( $filter( "filter" )( $rootScope.controllers, { "mac": $rootScope.activeController.mac } ) || [] )[ 0 ] ) === index ) {
					delete $rootScope.activeController.image;
					Utils.storage.set( { activeController: JSON.stringify( $rootScope.activeController ) } );
				}

				delete $rootScope.controllers[ index ].image;
		        Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
		        $timeout( function() {
					$scope.$apply();
		        } );
				return;
			}

			fileInput.parent()[ 0 ].reset();

			fileInput.one( "change", function() {
				var file = fileInput[ 0 ].files[ 0 ];

				if ( !file.type || !file.type.match( "image.*" ) ) {
					return;
				}

				var reader = new FileReader();
				reader.onload = function( evt ) {
					$scope.data.image = evt.target.result;
					$scope.data.index = index;
					$scope.crop.show();
				};
				reader.readAsDataURL( file );
			} );

			fileInput[ 0 ].click();
		};

		$scope.uploadPhoto = function( index ) {
			$scope.crop.hide();

			if ( $rootScope.controllers.indexOf( ( $filter( "filter" )( $rootScope.controllers, { "mac": $rootScope.activeController.mac } ) || [] )[ 0 ] ) === index ) {
				$rootScope.activeController.image = $scope.data.cropped;
				Utils.storage.set( { activeController: JSON.stringify( $rootScope.activeController ) } );
			}

			$rootScope.controllers[ index ].image = $scope.data.cropped;
	        Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
	        $timeout( function() {
				$scope.$apply();
	        } );
		};

		$scope.changeSync = function() {
			if ( $rootScope.isSynced ) {
				Cloud.logout();
			} else {
				Cloud.requestAuth();
			}
		};
	} )

	.controller( "HistoryCtrl", function( $scope, Utils ) {
		$scope.$on( "$ionicView.beforeEnter", function() {
			Utils.getLogs( function( reply ) {
				if ( reply ) {
					$scope.isLocal = true;
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

	.controller( "MenuCtrl", function( $scope, $rootScope, $ionicActionSheet, $ionicPopup, $ionicSideMenuDelegate, Utils ) {

		$scope.showAddController = function() {
			$ionicActionSheet.show( {
				buttons: [
					{ text: "Add by IP" },
					{ text: "Add by Blynk Token" },
					{ text: "Setup New Device" }
				],
				titleText: "Add Controller",
				cancelText: "Cancel",
				buttonClicked: function( index ) {
					if ( index === 1 ) {
						Utils.showAddBlynk();
					} else if ( index === 0 ) {
						Utils.showAddController();
					} else {
						$rootScope.$broadcast( "loading:show" );
						Utils.checkNewController( function( result ) {
							$rootScope.$broadcast( "loading:hide" );
							if ( !result ) {
								$ionicPopup.alert( {
									template: "<p class='center'>Please first connect the power to your OpenGarage. Once complete, connect this device to the wifi network broadcast by the OpenGarage (named OG_XXXXXX) and reopen this app.</p>"
								} );
							}
						} );
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

	.controller( "HomeCtrl", function( $rootScope, $scope, $timeout, Utils ) {
		var interval;

		$scope.toggleDoor = Utils.toggleDoor;

		$scope.$on( "$ionicView.beforeLeave", function() {
			clearInterval( interval );
		} );

		$scope.$on( "$ionicView.beforeEnter", function() {
			interval = setInterval( Utils.updateController, 3000 );
		} );

		$rootScope.$on( "controllerUpdated", function() {
			$timeout( function() {
				$scope.$apply();
			} );
		} );
	} );
