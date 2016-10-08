/* global angular, window */

// OpenGarage
angular.module( "opengarage.utils", [] )
    .factory( "Utils", [ "$injector", "$rootScope", function( $injector, $rootScope ) {

		var isFireFox = /Firefox/.test( window.navigator.userAgent ),
			isIE = /MSIE\s|Trident\/|Edge\//.test( window.navigator.userAgent ),

	        // Define storage wrapper functions
	        storage = {
	            get: function( query, callback ) {
	                callback = callback || function() {};

                    var data = {},
                        i;

                    if ( typeof query === "string" ) {
                        query = [ query ];
                    }

                    for ( i in query ) {
                        if ( query.hasOwnProperty( i ) ) {
                            data[ query[ i ] ] = localStorage.getItem( query[ i ] );
                        }
                    }

                    callback( data );
	            },
	            set: function( query, callback ) {
	                callback = callback || function() {};

                    var i;
                    if ( typeof query === "object" ) {
                        for ( i in query ) {
                            if ( query.hasOwnProperty( i ) ) {
                                localStorage.setItem( i, query[ i ] );
                            }
                        }
                    }

                    callback( true );
	            },
	            remove: function( query, callback ) {
	                callback = callback || function() {};

                    var i;

                    if ( typeof query === "string" ) {
                        query = [ query ];
                    }

                    for ( i in query ) {
                        if ( query.hasOwnProperty( i ) ) {
                            localStorage.removeItem( query[ i ] );
                        }
                    }

                    callback( true );
	            }
	        },
	        getControllerSettings = function( callback, ip ) {
				if ( !ip && !$rootScope.activeController ) {
					callback( false );
					return;
				}

				$http = $http || $injector.get( "$http" );

	            return $http( {
	                method: "GET",
	                url: "http://" + ( ip || $rootScope.activeController.ip ) + "/jc",
	                suppressLoader: true
	            } ).then(
					function( result ) {
						callback( result.data );
					},
					function() {
						callback( false );
					}
				);
	        },
	        getControllerOptions = function( callback, ip ) {
				if ( !ip && !$rootScope.activeController ) {
					callback( false );
					return;
				}

				$http = $http || $injector.get( "$http" );

	            return $http( {
	                method: "GET",
	                url: "http://" + ( ip || $rootScope.activeController.ip ) + "/jo",
	                suppressLoader: true
	            } ).then(
					function( result ) {
						callback( result.data );
					},
					function() {
						callback( false );
					}
				);
	        },
	        updateController = function( callback ) {
				$q = $q || $injector.get( "$q" );

				var controller = angular.copy( $rootScope.activeController ),
					save = function( data ) { angular.extend( controller, data ); };

				$q.when()
					.then( function() { return getControllerSettings( save ); } )
					.then( function() { return getControllerOptions( save ); } )
					.then( function() {
						var index = $rootScope.controllers.indexOf( $rootScope.activeController );

						$rootScope.controllers.splice( index, 1 );
						$rootScope.controllers.splice( index, 0, controller );
						$rootScope.activeController = controller;

						storage.set( { "controllers": JSON.stringify( $rootScope.controllers ), "activeController": JSON.stringify( $rootScope.activeController ) } );
					} );
	        },
			addController = function( data, callback ) {
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				if ( !data.ip || !data.password ) {
					$ionicPopup.alert( {
						template: "<p class='center'>Both an IP and password are required.</p>"
					} );
					callback( false );
					return;
				}

				getControllerSettings( function( result ) {
					if ( result && result.fwv ) {
						result.ip = data.ip;
						result.password = data.password;
						getControllerOptions( function( reply ) {
							angular.extend( result, reply );
							$rootScope.controllers.push( result );
							storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
							callback( true );
						}, data.ip );
					} else {
						$ionicPopup.alert( {
							template: "<p class='center'>Unable to find device. Please verify the IP/password and try again.</p>"
						} );
						callback( false );
					}
				}, data.ip );
			},
			$http, $q, $ionicPopup;

	    if ( isFireFox ) {
			HTMLElement.prototype.click = function() {
				var evt = this.ownerDocument.createEvent( "MouseEvents" );
				evt.initMouseEvent( "click", true, true, this.ownerDocument.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null );
				this.dispatchEvent( evt );
			};
	    }

	    // Return usable functions
	    return {
			isIE: isIE,
	        storage: storage,
	        getControllerSettings: getControllerSettings,
	        getControllerOptions: getControllerOptions,
	        updateController: updateController,
			showAddController: function( callback ) {
				callback = callback || function() {};
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				var scope = $rootScope.$new();
				scope.data = {};

				$ionicPopup.show( {
					templateUrl: "templates/addController.html",
					title: "Add Controller",
					scope: scope,
					buttons: [
						{ text: "Cancel" },
						{
							text: "<b>Add</b>",
							type: "button-positive",
							onTap: function( e ) {
								if ( !scope.data.ip || !scope.data.password ) {
									e.preventDefault();
									return;
								}

								return true;
							}
						}
					]
				} ).then(
					function( isValid ) {
						if ( isValid ) {
							addController( scope.data, callback );
						}
					}
				);
			},
			toggleDoor: function( callback ) {
				callback = callback || function() {};
				$http = $http || $injector.get( "$http" );

	            $http( {
	                method: "GET",
	                url: "http://" + $rootScope.activeController.ip + "/cc?dkey=" + encodeURIComponent( $rootScope.activeController.password ) + "&click=1"
	            } ).then(
					function( result ) {
						callback( true );
					},
					function() {
						callback( false );
					}
				);
			}
	    };
} ] );
