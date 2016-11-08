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
	        getControllerSettings = function( callback, ip, token ) {
				if ( !ip && !token && !$rootScope.activeController ) {
					callback( false );
					return;
				}

				$http = $http || $injector.get( "$http" );

				var promise;

				if ( token || ( !ip && ( $rootScope.activeController && $rootScope.activeController.auth ) ) ) {
					promise = $http( {
						method: "POST",
						url: "https://opensprinkler.com/wp-admin/admin-ajax.php",
		                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
						data: "action=blynkCloud&path=" + encodeURIComponent( token || $rootScope.activeController.auth ) + "/query",
						suppressLoader: true
					} );
				} else {
					promise = $http( {
						method: "GET",
						url: "http://" + ( ip || $rootScope.activeController.ip ) + "/jc",
						suppressLoader: ip ? false : true
					} );
				}

	            return promise.then(
					function( result ) {
						if ( token || ( !ip && ( $rootScope.activeController && $rootScope.activeController.auth ) ) ) {
							$filter = $filter || $injector.get( "$filter" );
							var filter = $filter( "filter" );

							result = result.data[ 0 ];
							callback( {
								name: result.name,
								door: parseInt( filter( result.pins, { "pin": 0 } )[ 0 ].value ),
								dist: parseInt( filter( result.pins, { "pin": 3 } )[ 0 ].value ),
								rcnt: parseInt( filter( result.pins, { "pin": 4 } )[ 0 ].value )
							} );
						} else {
							callback( result.data );
						}
					},
					function() {
						callback( false );
					}
				);
	        },
	        getControllerOptions = function( callback, ip, showLoader ) {
				if ( ( !ip && !$rootScope.activeController ) || ( $rootScope.activeController && !$rootScope.activeController.ip ) ) {
					callback( false );
					return;
				}

				$http = $http || $injector.get( "$http" );

	            return $http( {
	                method: "GET",
	                url: "http://" + ( ip || $rootScope.activeController.ip ) + "/jo",
	                suppressLoader: showLoader ? false : true
	            } ).then(
					function( result ) {
						callback( result.data );
					},
					function() {
						callback( false );
					}
				);
	        },
	        updateController = function() {
				$q = $q || $injector.get( "$q" );

				var controller = angular.copy( $rootScope.activeController ),
					save = function( data ) {
						$rootScope.connected = true;
						angular.extend( controller, data );
					};

				$q.when()
					.then( function() { return getControllerSettings( save ); } )
					.then( function() { return getControllerOptions( save ); } )
					.then( function() {
						var index = $rootScope.controllers.indexOf( $rootScope.activeController );

						$rootScope.controllers.splice( index, 1 );
						$rootScope.controllers.splice( index, 0, controller );
						$rootScope.activeController = controller;

						$rootScope.$broadcast( "controllerUpdated" );

						storage.set( { "controllers": JSON.stringify( $rootScope.controllers ), "activeController": JSON.stringify( $rootScope.activeController ) } );
					} );
	        },
			addController = function( data, callback ) {
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				if ( !data.token && ( !data.ip || !data.password ) ) {
					$ionicPopup.alert( {
						template: "<p class='center'>Both an IP and password are required.</p>"
					} );
					callback( false );
					return;
				}

				if ( data.token && data.token.length !== 32 ) {
					$ionicPopup.alert( {
						template: "<p class='center'>A valid Blynk token is required. Please verify your token and try again.</p>"
					} );
					callback( false );
					return;
				}

				getControllerSettings( function( result ) {
					if ( !result ) {
						$ionicPopup.alert( {
							template: "<p class='center'>Unable to find device. Please verify the IP/password and try again.</p>"
						} );
						callback( false );
					}

					if ( result.mac ) {
						result.ip = data.ip;
						result.password = data.password;

						$filter = $filter || $injector.get( "$filter" );

						if ( $filter( "filter" )( $rootScope.controllers, { "mac": result.mac } ).length > 0 ) {
							$ionicPopup.alert( {
								template: "<p class='center'>Device already added to site list.</p>"
							} );
							callback( false );
							return;
						}

						getControllerOptions( function( reply ) {
							angular.extend( result, reply );
							$rootScope.controllers.push( result );
							storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
							callback( true );
						}, data.ip );
					}

					if ( data.token ) {
						$http( {
							method: "POST",
							url: "https://opensprinkler.com/wp-admin/admin-ajax.php",
			                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
							data: "action=blynkCloud&path=" + data.token + "/get/V2",
							suppressLoader: true
						} ).then( function( reply ) {
							reply = reply.data.pop().split( " " )[ 1 ].split( "_" )[ 1 ];
							result.mac = "5C:CF:7F" + reply.match( /.{1,2}/g ).join( ":" );
							result.auth = data.token;
							$rootScope.controllers.push( result );
							storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
							callback( true );
						} );
					}
				},
				data.token ? null : data.ip,
				data.token ? data.token : null
				);
			},
			checkNewController = function() {
				$http = $http || $injector.get( "$http" );
				$ionicModal = $ionicModal || $injector.get( "$ionicModal" );

	            $http( {
	                method: "GET",
	                url: "http://192.168.4.1/js",
	                suppressLoader: true
	            } ).then(
					function( result ) {
						var scope = $rootScope.$new();
						scope.data = {};
						scope.save = function() {
							scope.modal.hide();
							connectNewController( scope.data );
						};
						scope.ssids = result.data.ssids;
						$ionicModal.fromTemplateUrl( "templates/newControllerSetup.html", {
							scope: scope,
							animation: "slide-in-up"
						} ).then( function( modal ) {
							scope.modal = modal;
							modal.show();
						} );
					}
				);
			},
			connectNewController = function( data ) {
				$http = $http || $injector.get( "$http" );
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

	            $http( {
	                method: "GET",
	                url: "http://192.168.4.1/cc?ssid=" + encodeURIComponent( data.ssid ) + "&pass=" + encodeURIComponent( data.password )
	            } ).then(
					function( result ) {
						if ( result.data.result === 1 ) {
							$ionicPopup.alert( {
								template: "<p class='center'>Controller succesfully connected! Please wait while the device reboots.</p>"
							} );
							saveNewController();
						} else {
							$ionicPopup.alert( {
								template: "<p class='center'>Invalid SSID/password combination. Please try again.</p>"
							} ).then( checkNewController );
						}
					},
					function() {
						$ionicPopup.alert( {
							template: "<p class='center'>Unable to reach controller. Please try again.</p>"
						} ).then( checkNewController );
					}
				);
			},
			saveNewController = function() {
				$http = $http || $injector.get( "$http" );
	            $http( {
	                method: "GET",
	                url: "http://192.168.4.1/jt"
	            } ).then( function( result ) {
					$rootScope.controllers.push( {
						ip: result.data.ip,
						password: "opendoor",
						name: "OpenGarage"
					} );
					storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
				} );
			},
			$http, $q, $filter, $ionicPopup, $ionicModal;

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
	        checkNewController: checkNewController,
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
			showAddBlynk: function( callback ) {
				callback = callback || function() {};
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				$ionicPopup.prompt( {
					title: "Add Controller by Blynk",
					template: "Enter your Blynk Auth token below:",
					inputType: "text",
					inputPlaceholder: "Your Blynk Auth token"
				} ).then( function( token ) {
					if ( token ) {
						addController( { token: token }, callback );
					}
				} );
			},
			toggleDoor: function( callback ) {
				callback = callback || function() {};
				$http = $http || $injector.get( "$http" );

				var promise;

				if ( $rootScope.activeController && $rootScope.activeController.auth ) {
					$rootScope.$broadcast( "loading:show" );
					promise = $http( {
						method: "POST",
						url: "https://opensprinkler.com/wp-admin/admin-ajax.php",
		                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
						data: "action=blynkCloud&path=" + encodeURIComponent( $rootScope.activeController.auth + "/update/V1?value=1" ),
						suppressLoader: true
					} ).then( function() {
						setTimeout( function() {
							$http( {
								method: "POST",
								url: "https://opensprinkler.com/wp-admin/admin-ajax.php",
				                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
								data: "action=blynkCloud&path=" + encodeURIComponent( $rootScope.activeController.auth + "/update/V1?value=0" ),
								suppressLoader: true
							} ).then( function() {
								$rootScope.$broadcast( "loading:hide" );
							} );
						}, 1000 );
					} );
				} else {
					promise = $http.get( "http://" + $rootScope.activeController.ip + "/cc?dkey=" + encodeURIComponent( $rootScope.activeController.password ) + "&click=1" );
				}

	            promise.then(
					function() {
						callback( true );
					},
					function() {
						callback( false );
					}
				);
			},
			restartController: function() {
				$http = $http || $injector.get( "$http" );
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				if ( $rootScope.activeController ) {
					$ionicPopup.confirm( {
						title: "Restart Controller?",
						template: "<p class='center'>Are you sure you want to restart the controller?</p>"
					} ).then( function( result ) {
						if ( result ) {
							$http.get( "http://" + $rootScope.activeController.ip + "/cc?dkey=" + encodeURIComponent( $rootScope.activeController.password ) + "&reboot=1" );
						}
					} );
				}
			},
			saveOptions: function( settings, callback ) {
				$http = $http || $injector.get( "$http" );

	            return $http( {
	                method: "GET",
	                url: "http://" + $rootScope.activeController.ip + "/co?dkey=" + $rootScope.activeController.password,
					params: settings,
					paramSerializer: "$httpParamSerializerJQLike"
	            } ).then(
					function( result ) {
						callback( result.data );
					},
					function() {
						callback( false );
					}
				);
			},
			changePassword: function() {
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				var scope = $rootScope.$new();
				scope.pwd = {};

				$ionicPopup.show( {
					templateUrl: "templates/changePassword.html",
					title: "Change Password",
					scope: scope,
					buttons: [
						{ text: "Cancel" },
						{
							text: "<b>Go</b>",
							type: "button-positive"
						}
					]
				} ).then( function() {
					if ( !scope.pwd.nkey || !scope.pwd.ckey || scope.pwd.nkey !== scope.pwd.ckey  ) {
						return;
					}

					$http = $http || $injector.get( "$http" );

		            $http( {
		                method: "GET",
		                url: "http://" + $rootScope.activeController.ip + "/co?dkey=" + $rootScope.activeController.password,
						params: scope.pwd,
						paramSerializer: "$httpParamSerializerJQLike"
		            } ).then( function() {
						$rootScope.activeController.password = scope.pwd.nkey;

						var index = $rootScope.controllers.indexOf( $rootScope.activeController );
						$rootScope.controllers.splice( index, 1 );
						$rootScope.controllers.splice( index, 0, $rootScope.activeController );

						storage.set( { "controllers": JSON.stringify( $rootScope.controllers ), "activeController": JSON.stringify( $rootScope.activeController ) } );

						$ionicPopup.alert( {
							template: "<p class='center'>Password updated succesfully!</p>"
						} );
					} );
				} );
			},
			getLogs: function( callback ) {
				$http = $http || $injector.get( "$http" );

	            $http( {
	                method: "GET",
	                url: "http://" + $rootScope.activeController.ip + "/jl"
	            } ).then(
					function( result ) {
						callback( result.data.logs.reverse() );
					},
					function() {
						callback( false );
					}
				);
			}
	    };
} ] );
