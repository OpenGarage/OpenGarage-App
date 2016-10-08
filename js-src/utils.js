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
			addController = function( data, callback ) {
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				if ( !data.ip || !data.password ) {
					$ionicPopup.alert( {
						template: "<p class='center'>Both an IP and password are required.</p>"
					} );
					callback( false );
					return;
				}

				$http = $http || $injector.get( "$http" );

	            $http( {
	                method: "GET",
	                url: "http://" + data.ip + "/jc"
	            } ).then(
					function( result ) {
						if ( result.data.fwv ) {
							result.data.ip = data.ip;
							result.data.password = data.password;
							$rootScope.controllers.push( result.data );
							storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
							callback( true );
						} else {
							callback( false );
						}
					},
					function() {
						$ionicPopup.alert( {
							template: "<p class='center'>Unable to find device. Please verify the IP/password and try again.</p>"
						} );
						callback( false );
					}
				);
			},
			$http, $ionicPopup;

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
			}
	    };
} ] );
