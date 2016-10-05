/* global angular */

angular.module( "opengarage.controllers", [ "opengarage.utils" ] )

	.controller( "SetupCtrl", function() {
	} )

	.controller( "HelpCtrl", function() {
	} )

	.controller( "ChangePassCtrl", function() {
	} )

	.controller( "ControllerSelectCtrl", function( $scope, $state, $rootScope, $filter, $ionicHistory, Utils ) {
		var orderFilter = $filter( "orderBy" );

		$scope.data = {};

		$scope.updateView = function() {
			$scope.filtered = orderFilter( $rootScope.controllers, "Name" );
			$scope.$broadcast( "scroll.refreshComplete" );
		};

		$scope.setController = function( controller ) {
			Utils.setController( controller );

			$ionicHistory.nextViewOptions( {
				historyRoot: true
			} );

			// Tells the controller's to drop their cached data as the controller has changed
			$rootScope.$broadcast( "updateData", { controllerChange: true } );
			$state.go( "app.home" );
		};

		$scope.showAddController = Utils.addController;

		$rootScope.$on( "updateData", function() {
			$scope.updateView();
			if ( $ionicHistory.currentView().stateId === "app.controllerSelect" ) {
				$state.go( "app.home" );
			}
		} );

		// Update each time the page is viewed
		$scope.$on( "$ionicView.beforeEnter", function() {
			if ( $rootScope.activeController ) {
				$scope.data.pageTitle = "Switch Controller";
			} else {
				$scope.data.pageTitle = "Select Controller";
			}

			$scope.updateView();
		} );
	} )

	.controller( "SettingsCtrl", function() {
	} )

	.controller( "MenuCtrl", function( $scope, $ionicSideMenuDelegate ) {

		// Function to close the menu which is fired after a side menu link is clicked.
		// This is done instead of using the menu-close directive to preserve the root history stack
	    $scope.closeMenu = function() {
            $ionicSideMenuDelegate.toggleLeft( false );
	    };
	} )

	.controller( "HomeCtrl", function() {
	} );
