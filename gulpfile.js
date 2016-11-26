/* global require, console, process */

// OpenGarage

// 1. LIBRARIES
// - - - - - - - - - - - - - - -

var gulp         = require( "gulp" ),               // Gulp
    gutil        = require( "gulp-util" ),          // Gulp Utilities
    autoprefixer = require( "gulp-autoprefixer" ),  // CSS Vendor Prefixing
    bower        = require( "bower" ),              // Bower
	fs           = require( "fs-extra" ),           // Node File Read/Write
	imagemin     = require( "gulp-imagemin" ),      // Image Optimization
	minifyCss    = require( "gulp-minify-css" ),    // CSS Minification
	notify       = require( "gulp-notify" ),        // Advanced Notifications
	rename       = require( "gulp-rename" ),        // Rename Files & Directories
	sass         = require( "gulp-sass" ),          // SASS Compilation
	sh           = require( "shelljs" ),            // Command Line Tools
	zip          = require( "gulp-zip" ),           // ZIP Packaging
	jshint       = require( "gulp-jshint" ),        // JSHint syntax check
	jscs         = require( "gulp-jscs" ),          // Javascript style checker
	sassLint     = require( "gulp-sass-lint" ),     // SASS syntax/style check
	uglify       = require( "gulp-uglify" ),        // Javascript minification
	concat       = require( "gulp-concat" ),        // Concatenate multiple files
	sourcemaps   = require( "gulp-sourcemaps" ),	// Generate sourcemap for minfied JS
	runSequence  = require( "run-sequence" ),       // Runs tasks in sequence
	manifest	 = require( "gulp-manifest" ),
	replace		 = require( "gulp-replace" ),
	argv		 = require( "yargs" ).argv,
	pkg			 = require( "./package.json" );

// 2. SET VARIABLES
// - - - - - - - - - - - - - - -

var paths = {
		sass: "./src/scss/**/*.s+(a|c)ss",
		js: "./src/js/**/*.js"
	};

// Suppress stdout on shell commands (comment to show errors)
sh.config.silent = true;

// If undefined in our process, load our local file
// (i.e. we aren't on an external server where we set these differently)
if ( !process.env.PHONEGAP_BUILD_ACCESS_TOKEN ) {
	require( "dotenv" ).load();
}

// 3. TASKS
// - - - - - - - - - - - - - - -

gulp.task( "default", function( callback ) {
	runSequence( "parse-args", "lint", "sass", "uglify", "manifest", callback );
} );

gulp.task( "build", function( callback ) {
	runSequence( "default", "images", "make-pgbuild", "clean", callback );
} );

gulp.task( "bump", function() {
	var ver = pkg.version.split( "." ),
		build = parseInt( pkg.build, 10 ) + 1,

		// Defines the index to increment (2 = patch, 1 = minor,  0 = major)
		type = 2;

	if ( argv.major ) {
		type = 0;
	} else if ( argv.minor ) {
		type = 1;
	}

	ver[ type ]++;
	ver = ver.join( "." );

	gulp.src( "package.json" )
		.pipe( replace( /(\"version\": \")[\d|\.]+(\")/, "$1" + ver + "$2" ) )
		.pipe( replace( /(\"build\": \")\d+/g, "$1" + build ) )
		.pipe( gulp.dest( "." ) );
} );

gulp.task( "parse-args", function() {
	gulp.src( "config.xml" )
		.pipe( replace( /(version=\")[\d|\.]+(\"\n)/, "$1" + pkg.version + "$2" ) )
		.pipe( replace( /(versionCode=\")\d+/g, "$1" + parseInt( pkg.build, 10 ) ) )
		.pipe( replace( /(CFBundleVersion=\")\d+/g, "$1" + parseInt( pkg.build, 10 ) ) )
		.pipe( replace( /(<string>)\d+(<\/string>)/, "$1" + parseInt( pkg.build, 10 ) + "$2" ) )
		.pipe( gulp.dest( "." ) );

	gulp.src( "www/index.html" )
		.pipe( replace( /(window\.appVersion=){.*}/, "$1" + JSON.stringify( {
			name: pkg.version,
			number: parseInt( pkg.build, 10 )
		} ) ) )
		.pipe( gulp.dest( "www" ) );
} );

// Optimizes Images
gulp.task( "images", function( done ) {
	var runner = gulp.src( "resources/**/**/*.*" )
		.pipe( imagemin( {
			optimizationLevel: 5,
			progressive: true,
			interlaced: true
		} ) )
		.pipe( gulp.dest( "resources" ) );
	runner.on( "end", function() {
		gulp.src( "" ).pipe( notify( "Image processing complete..." ) );
		done();
	} );
} );

// Build PhoneGap Build package and upload if possible
gulp.task( "make-pgbuild", function( done ) {
	gulp.src( [
		"www/**", "!www/web.config", "config.xml", "resources/**", "hooks/**", "!**/.DS_Store"
		], {
			dot: true,
			base: "./"
		} )
	.pipe( zip( "pgbuild-" + ( argv.release ? "release" : "debug" ) + ".zip" ) )
	.pipe( gulp.dest( "build" ) );

	sh.exec( "curl -s -X PUT -F file=@./build/pgbuild-" + ( argv.release ? "release" : "debug" ) + ".zip https://build.phonegap.com/api/v1/apps/?auth_token=" + process.env.PHONEGAP_BUILD_ACCESS_TOKEN,
		function() {
			gulp.src( "" ).pipe( notify( "PhoneGap Build complete..." ) );
			done();
		}
	);
} );

// Build Android package locally
gulp.task( "make-android", function( done ) {
	sh.exec( "cordova build android --release", function() {
		gulp.src( "platforms/android/build/outputs/apk/android-release-unsigned.apk" )
			.pipe( rename( "opengarage-unsigned.apk" ) )
			.pipe( gulp.dest( "build" ) )
			.pipe( notify( "Android complete..." ) );
		done();
	} );
} );

// Build iOS package locally
gulp.task( "make-ios", function( done ) {
	sh.exec( "cordova build ios --device", function() {
		gulp.src( "platforms/ios/build/device/OpenGarage.ipa" )
			.pipe( gulp.dest( "build" ) )
			.pipe( notify( "iOS complete..." ) );
		done();
	} );
} );

// Build OS X application locally
gulp.task( "make-osx", function( done ) {
	fs.removeSync( "platforms/osx/OpenGarage/Images.xcassets/AppIcon.appiconset" );
	fs.copySync( "resources/osx/icon/AppIcon.appiconset", "platforms/osx/OpenGarage/Images.xcassets/AppIcon.appiconset" );
	sh.exec( "cordova build osx", function() {
		fs.copySync( "platforms/osx/build/OpenGarage.app", "build/OpenGarage.app" );
		gulp.src( "" ).pipe( notify( "OS X complete..." ) );
		done();
	} );
} );

// Clean up after build (changes from `parse-args`)
gulp.task( "clean", function( done ) {
	sh.exec( "git stash", function() {
		done();
	} );
} );

// SASS Compilation

// Compiles SASS & attaches vendor prefixes
gulp.task( "sass", function() {
	return gulp.src( paths.sass )

	    // Use gulp-notify as SASS reporter
		.pipe( sass.sync( {
			style: "compressed",
			errLogToConsole: false,
			onError: function( err ) {
			    return notify().write( err );
			}
		} ) )
		.pipe( autoprefixer( {
			browsers: [ "last 2 versions", "ie 9", "ie 10" ]
		} ) )
		.pipe( minifyCss( {
			keepBreaks:true
		} ) )
		.pipe( rename( { extname: ".min.css" } ) )
        .pipe( gulp.dest( "./www/css/", { mode: "0755" } ) )
        .pipe( notify( { message: "CSS processing complete..." } ) );
} );

// Lint task
gulp.task( "lint", [ "lint-syntax", "lint-style", "lint-sass" ] );

gulp.task( "lint-syntax", function() {
  return gulp.src( [ paths.js, "*.js",  "./hooks/**/*.js", "!./hooks/after_prepare/uglify.js" ] )
    .pipe( jshint() )
	.pipe( jshint.reporter( "default" ) )
	.pipe( jshint.reporter( "fail" ) );
} );

gulp.task( "lint-style", function() {
	return gulp.src( [ paths.js, "*.js", "./hooks/**/*.js" ] )
		.pipe( jscs() )
		.pipe( jscs.reporter() )
		.pipe( jscs.reporter( "fail" ) );
} );

gulp.task( "lint-sass", function() {
	gulp.src( "/src/scss/*.scss" )
		.pipe( sassLint() )
		.pipe( sassLint.format() )
		.pipe( sassLint.failOnError() );
} );

// Javascript minification
gulp.task( "uglify", function() {
    return gulp.src( paths.js )
        .pipe( concat( "app.min.js" ) )
        .pipe( sourcemaps.init() )
        .pipe( uglify( {
			mangle: false
        } ) )
        .pipe( sourcemaps.write( "./" ) )
        .pipe( gulp.dest( "www/js/" ) );
} );

// SASS Listener
gulp.task( "watch", function() {
	gulp.watch( [ paths.sass, paths.js ], [ "sass", "uglify" ] );
} );

// Git
gulp.task( "install", [ "git-check" ], function() {
	return bower.commands.install()
		.on( "log", function( data ) {
			gutil.log( "bower", gutil.colors.cyan( data.id ), data.message );
		} );
} );

gulp.task( "git-check", function( done ) {
	if ( !sh.which( "git" ) ) {
		console.log(
			"  " + gutil.colors.red( "Git is not installed." ),
			"\n  Git, the version control system, is required to download Ionic.",
			"\n  Download git here:", gutil.colors.cyan( "http://git-scm.com/downloads" ) + ".",
			"\n  Once git is installed, run \'" + gutil.colors.cyan( "gulp install" ) + "\' again."
		);
		process.exit( 1 );
	}
	done();
} );

gulp.task( "manifest", function() {
	gulp.src( [
		"www/css/{ionic.app.min,style.min}.css",
		"www/img/**/*",
		"www/js/app.min.js",
		"www/templates/*.html",
		"www/lib/win-jscompat.js",
		"www/lib/ionic/js/ionic.bundle.min.js",
		"www/lib/ionic/fonts/ionicons.eot",
		"www/lib/ionic/fonts/ionicons.svg",
		"www/lib/ionic/fonts/ionicons.ttf",
		"www/lib/ionic/fonts/ionicons.woff",
		"www/favicon.ico",
		"www/index.html"
	], {
		base: "www"
	} )
	.pipe( manifest( {
		hash: true,
		preferOnline: false,
		network: [ "*" ],
		filename: "cache.manifest"
	} ) )
    .pipe( replace( /ionicons\.(eot|svg|ttf|woff)/g, "ionicons.$1?v=2.0.1" ) )
	.pipe( gulp.dest( "www" ) );
} );
