/* global angular, sjcl */

// OpenGarage
angular.module( "opengarage.cloud", [ "opengarage.utils" ] )
    .factory( "Cloud", [ "$injector", "$rootScope", "Utils", function( $injector, $rootScope, Utils ) {

        var requestAuth = function() {
                $ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

                var scope = $rootScope.$new();
                scope.data = {};

                $ionicPopup.show( {
                    templateUrl: "templates/cloudLogin.html",
                    title: "OpenGarage.io Login",
                    scope: scope,
                    buttons: [
                        { text: "Cancel" },
                        {
                            text: "<b>Login</b>",
                            type: "button-positive",
                            onTap: function( e ) {
                                if ( !scope.data.username || !scope.data.password ) {
                                    e.preventDefault();
                                    return;
                                }

                                return true;
                            }
                        }
                    ]
                } ).then( function( isValid ) {
                    if ( isValid ) {
                        login( scope.data.username, scope.data.password, syncStart );
                    }
                } );
            },
            login = function( user, pass, callback ) {
                callback = callback || function() {};
                $http = $http || $injector.get( "$http" );
                $httpParamSerializerJQLike = $httpParamSerializerJQLike || $injector.get( "$httpParamSerializerJQLike" );

                $http( {
                    method: "POST",
                    url: "https://opengarage.io/wp-admin/admin-ajax.php",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
					},
                    data: $httpParamSerializerJQLike( {
                        action: "ajaxLogin",
                        username: user,
                        password: pass
                    } )
                } ).then( function( data ) {
                    if ( typeof data.token === "string" ) {
                        Utils.storage.set( {
                            "cloudToken": data.token,
                            "cloudDataToken": sjcl.codec.hex.fromBits( sjcl.hash.sha256.hash( pass ) )
                        } );
                    }
                    callback( data.loggedin );
                }, function() {
                    callback( false );
                } );
            },
            syncStart = function() {
                $ionicActionSheet = $ionicActionSheet || $injector.get( "$ionicActionSheet" );

                getSites( function( sites ) {
                    if ( JSON.stringify( sites ) === JSON.stringify( $rootScope.controllers ) ) {
                        return;
                    }

                    if ( Object.keys( sites ).length > 0 ) {

                        var finish = function() {
                            Utils.storage.set( { "controllers": JSON.stringify( sites ) }, saveSites );
                        };

                        // Handle how to merge when cloud is populated
                        $ionicActionSheet.show( {
                            buttons: [
                                { text: "Merge" },
                                { text: "Replace local with cloud" },
                                { text: "Replace cloud with local" }
                            ],
                            titleText: "Select Merge Method",
                            cancelText: "Cancel",
                            buttonClicked: function( index ) {
                                if ( index === 1 ) {

                                    // Replace local with cloud
                                    finish();
                                } else if ( index === 2 ) {

                                    // Replace cloud with local
                                    sites = $rootScope.controllers;
                                    finish();
                                } else {

                                    // Merge data
                                    sites = $rootScope.controllers.concat( sites );
                                    finish();
                                }
                                return true;
                            }
                        } );
                    } else {
                        saveSites();
                    }
                } );
            },
            sync = function( callback ) {
                callback = callback || function() {};

                Utils.storage.get( "cloudToken", function( local ) {
                    if ( typeof local.cloudToken !== "string" ) {
                        return;
                    }

                    getSites( function( data ) {
                        if ( data !== false ) {
                            Utils.storage.set( { "controllers": JSON.stringify( data ) }, callback );
                        }
                    } );
                } );
            },
            getSites = function( callback ) {
                callback = callback || function() {};
                $http = $http || $injector.get( "$http" );
                $httpParamSerializerJQLike = $httpParamSerializerJQLike || $injector.get( "$httpParamSerializerJQLike" );

                Utils.storage.get( [ "cloudToken", "cloudDataToken" ], function( local ) {
                    if ( local.cloudToken === undefined || local.cloudToken === null ) {
                        callback( false );
                        return;
                    }

                    if ( local.cloudDataToken === undefined || local.cloudDataToken === null ) {
                        handleInvalidDataToken();
                        callback( false );
                        return;
                    }

                    $http( {
                        method: "POST",
                        url: "https://opengarage.io/wp-admin/admin-ajax.php",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
						},
                        data: $httpParamSerializerJQLike( {
                            action: "getSites",
                            token: local.cloudToken,
                            controllerType: "opengarage"
                        } )
                    } ).then( function( data ) {
                        if ( data.success === false || data.sites === "" ) {
                            if ( data.message === "BAD_TOKEN" ) {
                                handleExpiredLogin();
                            }
                            callback( false, data.message );
                        } else {
                            Utils.storage.set( { "cloudToken":data.token } );
                            var sites;

                            try {
                                sites = sjcl.decrypt( local.cloudDataToken, data.sites );
                            } catch ( err ) {
                                if ( err.message === "ccm: tag doesn't match" ) {
                                    handleInvalidDataToken();
                                }
                                callback( false );
                            }

                            try {
                                callback( JSON.parse( sites ) );
                            } catch ( err ) {
                                callback( false );
                            }
                        }
                    }, function() {
                        callback( false );
                    } );
                } );
            },
            saveSites = function( callback ) {
                callback = callback || function() {};
                $http = $http || $injector.get( "$http" );
                $httpParamSerializerJQLike = $httpParamSerializerJQLike || $injector.get( "$httpParamSerializerJQLike" );

                Utils.storage.get( [ "cloudToken", "cloudDataToken" ], function( data ) {
                    if ( data.cloudToken === null || data.cloudToken === undefined ) {
                        callback( false );
                        return;
                    }

                    $http( {
                        method: "POST",
                        url: "https://opengarage.io/wp-admin/admin-ajax.php",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
						},
                        data: $httpParamSerializerJQLike( {
                            action: "saveSites",
                            token: data.cloudToken,
                            controllerType: "opengarage",
                            sites: encodeURIComponent( JSON.stringify( sjcl.encrypt( data.cloudDataToken, $rootScope.controllers ) ) )
                        } )
                    } ).then( function( data ) {
                        if ( data.success === false ) {
                            if ( data.message === "BAD_TOKEN" ) {
                                handleExpiredLogin();
                            }
                            callback( false, data.message );
                        } else {
                            Utils.storage.set( { "cloudToken":data.token } );
                            callback( data.success );
                        }
                    }, function() {
                        callback( false );
                    } );
                } );
            },
            handleInvalidDataToken = function() {
                Utils.storage.remove( "cloudDataToken" );

                $ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );
                $ionicPopup.prompt( {
                    title: "Unable to read cloud data",
                    subTitle: "Enter a valid password to decrypt the data",
                    template: "Please enter your OpenSprinkler.com password. If you have recently changed your password, you may need to enter your previous password to decrypt the data.",
                    inputType: "password",
                    inputPlaceholder: "Password"
                } ).then( function( password ) {
                    Utils.storage.set( {
                        "cloudDataToken": sjcl.codec.hex.fromBits( sjcl.hash.sha256.hash( password ) )
                    } );
                    sync();
                } );
            },
            handleExpiredLogin = function() {
                Utils.storage.remove( "cloudToken" );

                $ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );
                $ionicPopup.confirm( {
                    title: "OpenGarage.io Login Expired",
                    template: "Click here to re-login to OpenGarage.io"
                } ).then( function( result ) {
                    if ( result ) {

                        requestAuth( function( result ) {
                            if ( result === true ) {
                                sync();
                            }
                        } );

                    }
                } );
            },
            getTokenUser = function( token ) {
                return atob( token ).split( "|" )[ 0 ];
            },
            $http, $httpParamSerializerJQLike, $ionicPopup, $ionicActionSheet;

        return {
            requestAuth: requestAuth,
            login: login,
            syncStart: syncStart,
            sync: sync,
            getSites: getSites,
            saveSites: saveSites,
            handleInvalidDataToken: handleInvalidDataToken,
            handleExpiredLogin: handleExpiredLogin,
            getTokenUser: getTokenUser
        };
    } ] );
