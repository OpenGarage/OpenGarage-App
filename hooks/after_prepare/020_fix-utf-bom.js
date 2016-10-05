#!/usr/bin/env node

var fs = require( "fs" ),
    path = require( "path" ),
    extensionsNeedBom = [ "css", "js", "html" ].map( function( extension ) {
        return "." + extension;
    } );

// Directory should be an absolute directory
function writeFilesWithBom( directory ) {
    var files = fs.readdirSync( directory ).map( function( file ) {
        return path.join( directory, file );
    } );
    for ( var i = 0; i < files.length; i++ ) {
        var file = files[ i ],
            stat = fs.statSync( file );

        if ( stat.isDirectory() ) {
            writeFilesWithBom( file );
        } else {
            if ( extensionsNeedBom.indexOf( path.extname( file ) ) === -1 ) {
                continue;
            }
            var buffer = fs.readFileSync( file );

            // Files didn't have the utf-8 bom
            if ( buffer.length > 2 && !( buffer[ 0 ] === 239 && buffer[ 1 ] === 187 ) ) {
                fs.writeFileSync( file, "\uFEFF" + buffer.toString(), "utf8" );
            }
        }
    }
}

if ( fs.existsSync( "platforms/windows/www" ) ) {
    writeFilesWithBom( path.resolve( "platforms/windows/www" ) );
}
