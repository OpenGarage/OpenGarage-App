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
			intToIP = function( int ) {
				return ( int % 256 ) + "." + ( ( int / 256 >> 0 ) % 256 ) + "." + ( ( ( int / 256 >> 0 ) / 256 >> 0 ) % 256 ) + "." + ( ( ( int / 256 >> 0 ) / 256 >> 0 ) / 256 >> 0 );
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
						url: "https://opengarage.io/wp-admin/admin-ajax.php",
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
							if ( result.data === "Invalid token." ) {
								callback( false );
								return;
							}

							$filter = $filter || $injector.get( "$filter" );
							var filter = $filter( "filter" );

							result = result.data[ 0 ];
							callback( {
								name: result.name,
								door: parseInt( filter( result.pins, { "pin": 0 } )[ 0 ].value ),
								dist: parseInt( filter( result.pins, { "pin": 3 } )[ 0 ].value ),
								rcnt: parseInt( filter( result.pins, { "pin": 4 } )[ 0 ].value ),
								lastUpdate: new Date().getTime()
							} );
						} else {
							result.data.lastUpdate = new Date().getTime();
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
				$filter = $filter || $injector.get( "$filter" );

				var controller = angular.copy( $rootScope.activeController ),
					save = function( data ) {
						$rootScope.connected = true;
						angular.extend( controller, data );
					};

				$q.when()
					.then( function() { return getControllerSettings( save ); } )
					.then( function() { return getControllerOptions( save ); } )
					.then( function() {
						var index = getControllerIndex();

						if ( index >= 0 && controller.mac === $rootScope.activeController.mac ) {
							$rootScope.controllers[ index ] = controller;
							$rootScope.activeController = controller;
							$rootScope.$broadcast( "controllerUpdated" );
							storage.set( { "controllers": JSON.stringify( $rootScope.controllers ), "activeController": JSON.stringify( $rootScope.activeController ) } );
						}
					} );
	        },
	        getControllerIndex = function( mac ) {
				if ( !$rootScope.activeController && !mac ) {
					return null;
				}

				mac = mac || ( $rootScope.activeController === null ? "" : $rootScope.activeController.mac );

				for ( var i = 0; i < $rootScope.controllers.length; i++ ) {
					if ( $rootScope.controllers[ i ].mac === mac ) {
						return i;
					}
				}
				return null;
	        },
	        setController = function( controller, callback ) {
				callback = callback || function() {};

				cancelPendingHttp();
				$rootScope.activeController = typeof controller === "object" ? controller : $rootScope.controllers[ controller ];
				$rootScope.connected = false;
				updateController();
				storage.set( { activeController: JSON.stringify( $rootScope.activeController ) }, callback );
				updateQuickLinks();
	        },
			addController = function( data, callback ) {
				callback = callback || function() {};
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
							$rootScope.$broadcast( "triggerCloudSave" );
							updateQuickLinks();
							callback( true );
						}, data.ip );
					}

					if ( data.token ) {
						$http( {
							method: "POST",
							url: "https://openthings.io/wp-admin/admin-ajax.php",
			                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
							data: "action=blynkCloud&path=" + data.token + "/get/V2",
							suppressLoader: true
						} ).then( function( reply ) {
							if ( reply.data === "Invalid token." ) {
								$ionicPopup.alert( {
									template: "<p class='center'>Invalid Blynk token.</p>"
								} );
								callback( false );
								return;
							}

							reply = reply.data.pop().split( " " )[ 1 ].split( "_" )[ 1 ];
							result.mac = "5C:CF:7F:" + reply.match( /.{1,2}/g ).join( ":" );
							result.auth = data.token;

							if ( $filter( "filter" )( $rootScope.controllers, { "mac": result.mac } ).length > 0 ) {
								$ionicPopup.alert( {
									template: "<p class='center'>Device already added to site list.</p>"
								} );
								callback( false );
								return;
							}

							$rootScope.controllers.push( result );
							storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
							$rootScope.$broadcast( "triggerCloudSave" );
							updateQuickLinks();
							callback( true );
						} );
					}
				},
				data.token ? null : data.ip,
				data.token ? data.token : null
				);
			},
			checkNewController = function( callback, suppressLoader ) {
				$http = $http || $injector.get( "$http" );
				callback = callback || function() {};
				$ionicModal = $ionicModal || $injector.get( "$ionicModal" );

	            $http( {
	                method: "GET",
	                url: "http://192.168.4.1/js",
	                suppressLoader: typeof suppressLoader !== "undefined" ? suppressLoader : true,
					timeout: 5000,
					retryCount: 3
	            } ).then(
					function( result ) {
						if ( !result.data.ssids ) {
							callback( false );
							return;
						}

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
						callback( true );
					},
					function() {
						callback( false );
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
							setTimeout( saveNewController, 2000 );
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
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

	            $http( {
	                method: "GET",
	                url: "http://192.168.4.1/jt"
	            } ).then( function( result ) {
					if ( result.data.ip === 0 ) {
						$ionicPopup.alert( {
							template: "<p class='center'>Controller was unable to connect. Please check your SSID and password and try again.</p>"
						} );
						return;
					}

					$ionicPopup.alert( {
						template: "<p class='center'>Controller succesfully connected! Please wait while the device reboots.</p>"
					} );

					$rootScope.controllers.push( {
						ip: intToIP( result.data.ip ),
						password: "opendoor",
						name: "My OpenGarage"
					} );
					storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
					$rootScope.$broadcast( "triggerCloudSave" );
					updateQuickLinks();
				} );
			},
			scanLocalNetwork = function( callback ) {
				if ( !window.networkinterface ) {
					callback( false );
					return;
				}

				window.networkinterface.getIPAddress( function( router ) {
					if ( !router ) {
						callback( false );
						return;
					}

					$q = $q || $injector.get( "$q" );
					$http = $http || $injector.get( "$http" );
					router = router.split( "." );
					router.pop();

					var baseip = router.join( "." ),
						check = function( ip ) {
							return $http( {
									method: "GET",
									url: "http://" + baseip + "." + ip + "/jc",
									suppressLoader: true,
									timeout: 6000,
									retryCount: 3
								} )
								.then( function( result ) {
									if ( result.data && result.data.mac ) {
										matches.push( baseip + "." + ip );
									}
								} )
								.catch( function() {
									return false;
								} );
						},
						queue = [], matches = [], i;

					$rootScope.$broadcast( "loading:show" );

				    for ( i = 1; i <= 244; i++ ) {
				        queue.push( check( i ) );
				    }

				    $q.all( queue ).then( function() {
						$rootScope.$broadcast( "loading:hide" );
						callback( matches );
				    } );
				} );
			},
			requestPassword = function( callback ) {
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				$ionicPopup.prompt( {
					title: "Enter Controller Password",
					template: "Enter your controller's password below:",
					inputType: "password",
					inputPlaceholder: "Controller Password"
				} ).then( function( password ) {
					callback( password );
				} );
			},
			updateQuickLinks = function() {
				if ( !window.ThreeDeeTouch ) {
					return;
				}

				window.ThreeDeeTouch.isAvailable( function( isAvailable ) {
					if ( !isAvailable || !$rootScope.controllers.length ) {
						return;
					}

					var links = [],
						limit = $rootScope.controllers.length < 4 ? $rootScope.controllers.length : 4;

					for ( var i = 0; i < limit; i++ ) {
						links.push( {
							type: "toggle-" + $rootScope.controllers[ i ].mac,
							title: "Toggle " + $rootScope.controllers[ i ].name,
							iconType: "Update"
						} );
					}

					window.ThreeDeeTouch.configureQuickActions( links );
				} );
			},
			cancelPendingHttp = function() {
				$http = $http || $injector.get( "$http" );

				$http.pendingRequests.forEach( function( pendingReq ) {
					if ( pendingReq.cancel ) {
						pendingReq.cancel.resolve();
					}
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
	        setController: setController,
	        getControllerIndex: getControllerIndex,
	        checkNewController: checkNewController,
	        updateQuickLinks: updateQuickLinks,
			showAddController: function( callback ) {
				callback = callback || function() {};
				$ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

				var scope = $rootScope.$new();
				scope.data = {
					canScan: window.networkinterface ? true : false
				};
				scope.scan = function() {
					scanLocalNetwork( function( result ) {
						if ( !result || !result.length ) {
							$ionicPopup.alert( {
								template: "<p class='center'>No devices detected on your network</p>"
							} );
							return;
						}

						scope.data.foundControllers = result;
					} );
				};
				scope.save = function( ip ) {
					popup.close();
					requestPassword( function( password ) {
						addController( {
							ip: ip,
							password: password
						} );
					} );
				};

				var popup = $ionicPopup.show( {
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
				} );

				popup.then(
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
			toggleDoor: function( auth, callback ) {
				if ( typeof auth === "function" ) {
					callback = auth;
					auth = null;
				}

				callback = callback || function() {};
				$http = $http || $injector.get( "$http" );

				var promise;

				if ( auth || ( $rootScope.activeController && $rootScope.activeController.auth ) ) {
					promise = $http( {
						method: "POST",
						url: "https://openthings.io/wp-admin/admin-ajax.php",
		                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
						data: "action=blynkCloud&path=" + encodeURIComponent( ( auth || $rootScope.activeController.auth ) + "/update/V1?value=1" )
					} ).then( function() {
						setTimeout( function() {
							$http( {
								method: "POST",
								url: "https://openthings.io/wp-admin/admin-ajax.php",
				                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
				                suppressLoader: true,
								data: "action=blynkCloud&path=" + encodeURIComponent( ( auth || $rootScope.activeController.auth ) + "/update/V1?value=0" )
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

						var index = $rootScope.controllers.indexOf( ( $filter( "filter" )( $rootScope.controllers, { "mac": $rootScope.activeController.mac } ) || [] )[ 0 ] );
						if ( index ) {
							$rootScope.controllers[ index ] = $rootScope.activeController;
							storage.set( { "controllers": JSON.stringify( $rootScope.controllers ), "activeController": JSON.stringify( $rootScope.activeController ) } );
							$rootScope.$broadcast( "triggerCloudSave" );
						}

						$ionicPopup.alert( {
							template: "<p class='center'>Password updated succesfully!</p>"
						} );
					} );
				} );
			},
			getLogs: function( callback ) {
				if ( !$rootScope.activeController || !$rootScope.activeController.ip ) {
					callback( false );
					return;
				}

				$http = $http || $injector.get( "$http" );

	            $http( {
	                method: "GET",
	                url: "http://" + $rootScope.activeController.ip + "/jl"
	            } ).then(
					function( result ) {
						callback( result.data.logs.sort( function( a, b ) { return b[ 0 ] - a[ 0 ]; } ) );
					},
					function() {
						callback( false );
					}
				);
			},
			selectPhoto: function( $event, index, deletePhoto ) {
				$ionicModal = $ionicModal || $injector.get( "$ionicModal" );

				var scope = $rootScope.$new(),
					fileInput = angular.element( document.getElementById( "photoUpload" ) );

				scope.data = {
					image: false,
					cropped: false,
					index: false
				};

				scope.uploadPhoto = function( index ) {
					scope.crop.hide();

					if ( getControllerIndex() === index ) {
						$rootScope.activeController.image = scope.data.cropped;
						storage.set( { activeController: JSON.stringify( $rootScope.activeController ) } );
					}

					$rootScope.controllers[ index ].image = scope.data.cropped;
			        storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
			        $rootScope.$broadcast( "triggerCloudSave" );
				};

				$ionicModal.fromTemplateUrl( "templates/crop.html", {
					scope: scope
				} ).then( function( modal ) {
					scope.crop = modal;
				} );

				$event.stopPropagation();

				if ( deletePhoto ) {
					if ( getControllerIndex() === index ) {
						delete $rootScope.activeController.image;
						storage.set( { activeController: JSON.stringify( $rootScope.activeController ) } );
					}

					delete $rootScope.controllers[ index ].image;
			        storage.set( { controllers: JSON.stringify( $rootScope.controllers ) } );
			        $rootScope.$broadcast( "triggerCloudSave" );
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
						scope.data.image = evt.target.result;
						scope.data.index = index;
						scope.crop.show();
					};
					reader.readAsDataURL( file );
				} );

				fileInput[ 0 ].click();
			}
	    };
} ] );
