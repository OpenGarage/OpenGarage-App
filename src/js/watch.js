/* global angular */

// OpenGarage
angular.module( "opengarage.watch", [] )
    .factory( "Watch", [ "$injector", "$rootScope", function( $injector, $rootScope ) {

		var loadApp = function() {
            window.applewatch.loadAppMain( {
                title: "OpenGarage",
                label: {
                    value: "Toggle Garage Door",
                    color: "#FFA500",
                    font: {
                        size: 12
                    }
                },
                table: {
                    callback: "toggleDoorByIndex",
                    alpha: 1,
                    rows: makeAppList()
                }
            } );
        },
        makeAppList = function() {
            var rows = [];

            $rootScope.controllers.forEach( function( controller ) {
				var item = {
                    type: "OneColumnSelectableRowType",
                    group: {
                        backgroundColor: "#1884C4",
                        cornerRadius: 8
                    },
                    label: {
                        value: " " + controller.name
                    }
                };

                if ( controller.image ) {

					var canvas = document.createElement( "canvas" ),
						ctx = canvas.getContext( "2d" ),
						img = new Image();

					img.src = controller.image;

					canvas.width = 25;
					canvas.height = 30;
					ctx.drawImage( img, 0, 0, canvas.width, canvas.height );

					item.imageLeft = {
                        data: canvas.toDataURL( "image/png" ),
                        width: canvas.width,
                        height: canvas.height
                    };
                }

                rows.push( item );
            } );

            return rows;
        };

        $rootScope.$on( "controllersUpdated", function() {
            if ( window.applewatch ) {
                loadApp();
            }
        } );

        return {
            loadApp: loadApp
        };
    } ] );
