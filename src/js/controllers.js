/* global angular */

angular.module( "opengarage.controllers", [ "opengarage.utils" ] )

	.controller( "ControllerSelectCtrl", function( $scope, $state, $rootScope, $filter, $ionicHistory, Utils ) {
		$scope.data = {
			showDelete: false
		};

		$scope.setController = function( index ) {
			$rootScope.activeController = $rootScope.controllers[ index ];
			Utils.storage.set( { activeController: JSON.stringify( $rootScope.activeController ) } );

			$ionicHistory.nextViewOptions( {
				historyRoot: true
			} );

			$state.go( "app.home" );
		};

		$scope.deleteController = function( index ) {
			if ( $rootScope.controllers.indexOf( $rootScope.activeController ) === index ) {
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

	.controller( "MenuCtrl", function( $scope, $ionicSideMenuDelegate, Utils ) {

		$scope.showAddController = Utils.showAddController;

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
