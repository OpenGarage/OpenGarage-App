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
			$rootScope.controllers.splice( index, 1 );
			Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
		};

		$scope.moveItem = function( item, fromIndex, toIndex ) {
			$rootScope.controllers.splice( fromIndex, 1 );
			$rootScope.controllers.splice( toIndex, 0, item );
			Utils.storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
		};

		// Update each time the page is viewed
		$scope.$on( "$ionicView.beforeEnter", function() {
			if ( $rootScope.activeController ) {
				$scope.data.pageTitle = "Switch Controller";
			} else {
				$scope.data.pageTitle = "Select Controller";
			}
		} );
	} )

	.controller( "HistoryCtrl", function() {
	} )

	.controller( "SettingsCtrl", function() {
	} )

	.controller( "MenuCtrl", function( $scope, $ionicSideMenuDelegate, Utils ) {

		$scope.showAddController = Utils.showAddController;

		// Function to close the menu which is fired after a side menu link is clicked.
		// This is done instead of using the menu-close directive to preserve the root history stack
	    $scope.closeMenu = function() {
            $ionicSideMenuDelegate.toggleLeft( false );
	    };
	} )

	.controller( "HomeCtrl", function( $scope, Utils ) {
		var interval;

		$scope.changing = false;

		$scope.toggleDoor = function() {
			$scope.changing = true;

			Utils.toggleDoor( function( result ) {
				$scope.changing = false;
			} );
		};

		$scope.$on( "$ionicView.beforeLeave", function() {
			clearInterval( interval );
		} );

		$scope.$on( "$ionicView.beforeEnter", function() {
			interval = setInterval( Utils.updateController, 5000 );
		} );
	} );
