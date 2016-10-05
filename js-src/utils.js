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

	        setController = function() {
	        };

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
	        setController: setController,
			networkDown: function() {
				if ( $rootScope.networkStatus === "down" ) {
					return;
				}

				$rootScope.networkStatus = "down";
				$rootScope.$broadcast( "networkDown" );
			},
			networkUp: function() {
				if ( $rootScope.networkStatus === "up" ) {
					return;
				}

				$rootScope.networkStatus = "up";
				$rootScope.$broadcast( "networkUp" );
			}
	    };
} ] );
