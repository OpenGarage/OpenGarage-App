#!/usr/bin/env node

// Add Platform Class
// v1.0
// Automatically adds the platform class to the body tag
// after the `prepare` command. By placing the platform CSS classes
// directly in the HTML built for the platform, it speeds up
// rendering the correct layout/style for the specific platform
// instead of waiting for the JS to figure out the correct classes.

var fs = require( "fs" ),
	path = require( "path" ),
	rootdir = process.argv[ 2 ];

function addPlatformBodyTag( indexPath, platform ) {

	// Add the platform class to the body tag
	try {
		var platformClass = "platform-" + platform,
			cordovaClass = "platform-cordova platform-webview",
			html = fs.readFileSync( indexPath, "utf8" ),
			bodyTag = findBodyTag( html );

		if ( !bodyTag ) {

			// No opening body tag, something's wrong
			return;
		}

		if ( bodyTag.indexOf( platformClass ) > -1 ) {

			// Already added
			return;
		}

		var newBodyTag = bodyTag,
			classAttr = findClassAttr( bodyTag );

		if ( classAttr ) {

			// Body tag has existing class attribute, add the classname
			var endingQuote = classAttr.substring( classAttr.length - 1 ),
				newClassAttr = classAttr.substring( 0, classAttr.length - 1 );

			newClassAttr += " " + platformClass + " " + cordovaClass + endingQuote;
			newBodyTag = bodyTag.replace( classAttr, newClassAttr );

		} else {

			// Add class attribute to the body tag
			newBodyTag = bodyTag.replace( ">", " class='" + platformClass + " " + cordovaClass + "'>" );
		}

		html = html.replace( bodyTag, newBodyTag );
		fs.writeFileSync( indexPath, html, "utf8" );

		process.stdout.write( "add to body class: " + platformClass + "\n" );
	} catch ( err ) {
		process.stdout.write( err );
	}
}

function findBodyTag( html ) {

	// Get the body tag
	try {
		return html.match( /<body(?=[\s>])(.*?)>/gi )[ 0 ];
	} catch ( err ) {}
}

function findClassAttr( bodyTag ) {

	// Get the body tag's class attribute
	try {
		return bodyTag.match( / class=["|'](.*?)["|']/gi )[ 0 ];
	} catch ( err ) {}
}

if ( rootdir ) {

	// Go through each of the platform directories that have been prepared
	var platforms = ( process.env.CORDOVA_PLATFORMS ? process.env.CORDOVA_PLATFORMS.split( "," ) : [] );

	for ( var x = 0; x < platforms.length; x++ ) {

		// Open up the index.html file at the www root
		try {
			var platform = platforms[ x ].trim().toLowerCase(),
				indexPath;

			if ( platform === "android" ) {
				indexPath = path.join( "platforms", platform, "assets", "www", "index.html" );
			} else {
				indexPath = path.join( "platforms", platform, "www", "index.html" );
			}

			if ( fs.existsSync( indexPath ) ) {
				addPlatformBodyTag( indexPath, platform );
			}

		} catch ( err ) {
			process.stdout.write( err );
		}
	}
}
