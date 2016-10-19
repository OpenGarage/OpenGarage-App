#!/usr/bin/env node

var fs = require( "fs" );

if ( fs.existsSync( "platforms/ios/cordova" ) ) {
    fs.appendFileSync( "platforms/ios/cordova/build.xcconfig", "\nSWIFT_VERSION=2.3\n" );
    process.stdout.write( "add legacy swift version" );
}
