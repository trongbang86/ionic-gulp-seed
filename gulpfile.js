'use strict';

// change this to your app's name (angular module)
var appName = 'IonicGulpSeed';


var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var beep = require('beepbeep');
var express = require('express');
var path = require('path');
var open = require('open');
var stylish = require('jshint-stylish');
var connectLr = require('connect-livereload');
var streamqueue = require('streamqueue');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var ripple = require('ripple-emulator');
var cache = require('gulp-cached');
var KarmaServer = require('karma').Server;
var spawn = require('child_process').spawn;
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var map = require('map-stream');

/*
 * lodash-deep is used for getEnvConfig
 * for deep extend
 */
var underscoreDeepExtend = require('underscore-deep-extend');
_.mixin({deepExtend: underscoreDeepExtend(_)});

// this is the express server which 
// will be initiated when gulp serve
var server = null;

/**
 * Parse arguments
 */
var args = require('./utils.js').getArguments();

var build = !!(args.build || args.emulate || args.run);
var emulate = args.emulate;
var run = args.run;
var port = args.port;
var stripDebug = !!args.stripDebug;
var targetDir = path.resolve(build ? 'www' : '.tmp');
var debug = args.debug;
var keepSource = args.source;

// if we just use emualate or run without specifying platform, we assume iOS
// in this case the value returned from yargs would just be true
if (emulate === true) {
    emulate = 'ios';
}
if (run === true) {
    run = 'ios';
}

// global error handler
function errorHandler(error) {
  console.log('beep: ', beep);
  beep();
  if (build) {
    throw error;
  } else {
    plugins.util.log(error);
  }
};


// clean target dir
gulp.task('clean', function(done) {
  del([targetDir], done);
});

// precompile .scss and concat with ionic.css
gulp.task('styles', function() {

  var options = build ? { style: 'compressed' } : { style: 'expanded' };

  var sassStream = gulp.src('app/styles/main.scss')
    .on('error', function(err) {
      console.log('err: ', err);
      beep();
    });

  return sassStream
    .pipe(plugins.sass(options))
    .pipe(plugins.autoprefixer('last 1 Chrome version', 'last 3 iOS versions', 'last 3 Android versions'))
    .pipe(plugins.concat('main.css'))
    .pipe(plugins.if(build && !keepSource, plugins.stripCssComments()))
    .pipe(plugins.if(build && !emulate, plugins.rev()))
    .pipe(gulp.dest(path.join(targetDir, 'styles')))
    .on('error', errorHandler);
});


// build templatecache, copy scripts.
// if build: concat, minsafe, uglify and versionize
gulp.task('scripts', function() {
  var dest = path.join(targetDir, 'scripts');

  var minifyConfig = {
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true,
    removeComments: true
  };

  // prepare angular template cache from html templates
  // (remember to change appName var to desired module name)
  var templateStream = gulp
    .src('**/*.html', { cwd: 'app/templates'})
    .pipe(plugins.angularTemplatecache('templates.js', {
      root: 'templates/',
      module: appName,
      htmlmin: build && !keepSource && minifyConfig
    }));


  var envConfig = getEnvConfig();

  var scriptStream = gulp
    .src(['templates.js', 'app.js', '**/*.js'], { cwd: 'app/scripts' })
    .pipe(plugins.tokenReplace({tokens: envConfig}))
    .pipe(plugins.if(!build, plugins.changed(dest)));


  return streamqueue({ objectMode: true }, scriptStream, templateStream)
    .pipe(plugins.iife())
    .pipe(plugins.if(build && !keepSource, plugins.ngAnnotate()))
    .pipe(plugins.if(stripDebug, plugins.stripDebug()))
    .pipe(plugins.if(build && !keepSource, plugins.concat('app.js')))
    .pipe(plugins.if(build && !keepSource, plugins.uglify()))
    .pipe(plugins.if(build && !emulate, plugins.rev()))

    .pipe(gulp.dest(dest))

    .on('error', errorHandler);
});

// copy fonts
gulp.task('fonts', function() {
  return gulp
    .src(['app/fonts/*.*', 
          'bower_components/ionic/fonts/*.*',
          'bower_components/components-font-awesome/fonts/*.*'])

    .pipe(gulp.dest(path.join(targetDir, 'fonts')))

    .on('error', errorHandler);
});


// copy templates
gulp.task('templates', function() {
  return gulp.src('app/templates/**/*.*')
    .pipe(gulp.dest(path.join(targetDir, 'templates')))

    .on('error', errorHandler);
});

// generate iconfont
gulp.task('iconfont', function(){
  return gulp.src('app/icons/*.svg', {
        buffer: false
    })
    .pipe(plugins.iconfontCss({
      fontName: 'ownIconFont',
      path: 'app/icons/own-icons-template.css',
      targetPath: '../styles/own-icons.css',
      fontPath: '../fonts/'
    }))
    .pipe(plugins.iconfont({
        fontName: 'ownIconFont'
    }))
    .pipe(gulp.dest(path.join(targetDir, 'fonts')))
    .on('error', errorHandler);
});

// copy images
gulp.task('images', function() {
  return gulp.src('app/images/**/*.*')
    .pipe(gulp.dest(path.join(targetDir, 'images')))

    .on('error', errorHandler);
});


// lint js sources based on .jshintrc ruleset
gulp.task('jsHint', function(done) {
  return gulp
    .src('app/scripts/**/*.js')
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter(stylish))
    .pipe(jshintFileReporter('./.jshint-errors.log'))

    .on('error', errorHandler);
    done();
});

/**
 * This writes jshint errors to a file
 * Ref: https://github.com/spenceralger/gulp-jshint#custom-reporters
 */
var jshintFileReporter = function (filename) {
  var stream;
  var writeFailures = function (path, errors) {
    var out = [];
    out.push(errors.length + ' lint errors found in ' + path);
    errors.forEach(function (error) {
        var err = error.error;
        out.push(
                '  [' + err.line + ',' + err.character + '](' + err.code + ') ' +
                err.reason
                );
    });

    out.push('\n\n');

    if(!stream) {
        stream = fs.createWriteStream(filename);
    }

    stream.write(out.join('\n'));
  };

  return map(function (file, cb) {
    if (file.jshint && file.jshint.success === false) {
      writeFailures(file.path, file.jshint.results.filter(Boolean));
    }
    return cb(null, file);
  });
};

// concatenate and minify vendor sources
gulp.task('vendor', function() {
  var vendorFiles = require('./vendor.json');

  return gulp.src(vendorFiles)
    .pipe(plugins.concat('vendor.js'))
    .pipe(plugins.if(build && !keepSource, plugins.uglify()))
    .pipe(plugins.if(build, plugins.rev()))

    .pipe(gulp.dest(targetDir))

    .on('error', errorHandler);
});


// inject the files in index.html
gulp.task('index', ['jsHint', 'scripts'], function() {

  // build has a '-versionnumber' suffix
  var cssNaming = 'styles/main*';

  // injects 'src' into index.html at position 'tag'
  var _inject = function(src, tag) {
    return plugins.inject(src, {
      starttag: '<!-- inject:' + tag + ':{{ext}} -->',
      read: false,
      addRootSlash: false
    });
  };

  // get all our javascript sources
  // in development mode, it's better to add each file seperately.
  // it makes debugging easier.
  var _getAllScriptSources = function() {
    var scriptStream = gulp.src(['scripts/app*.js', 'scripts/**/*.js'], { cwd: targetDir });
    return streamqueue({ objectMode: true }, scriptStream);
  };

  return gulp.src('app/index.html')
    // inject css
    .pipe(_inject(gulp.src(cssNaming, { cwd: targetDir }), 'app-styles'))
    // inject vendor.js
    .pipe(_inject(gulp.src('vendor*.js', { cwd: targetDir }), 'vendor'))
    // inject app.js (build) or all js files indivually (dev)
    .pipe(plugins.if(build && !keepSource,
      _inject(gulp.src('scripts/app*.js', { cwd: targetDir }), 'app'),
      _inject(_getAllScriptSources(), 'app')
    ))

    .pipe(gulp.dest(targetDir))
    .on('error', errorHandler);
});

// start local express server
gulp.task('serve', function() {
  server = express()
    .use(!build ? connectLr() : function(){})
    .use(express.static(targetDir))
    .listen(port);
  open('http://localhost:' + port + '/');
});

// ionic emulate wrapper
gulp.task('ionic:emulate', plugins.shell.task([
  'ionic emulate ' + emulate + ' --livereload --consolelogs'
]));

// ionic run wrapper
gulp.task('ionic:run', plugins.shell.task([
  'ionic run ' + run
]));

// ionic resources wrapper
gulp.task('icon', plugins.shell.task([
  'ionic resources --icon'
]));
gulp.task('splash', plugins.shell.task([
  'ionic resources --splash'
]));
gulp.task('resources', plugins.shell.task([
  'ionic resources'
]));

// select emulator device
gulp.task('select', plugins.shell.task([
  './emulateios'
]));

// ripple emulator
gulp.task('ripple', ['scripts', 'styles', 'watchers'], function() {

  var options = {
    keepAlive: false,
    open: true,
    port: 4400
  };

  // Start the ripple server
  ripple.emulate.start(options);

  open('http://localhost:' + options.port + '?enableripple=true');
});


// start watchers
gulp.task('watchers', function() {
  plugins.livereload.listen();
  gulp.watch('app/styles/**/*.scss', ['styles']);
  gulp.watch('app/fonts/**', ['fonts']);
  gulp.watch('app/icons/**', ['iconfont']);
  gulp.watch('app/images/**', ['images']);
  gulp.watch('app/scripts/**/*.js', ['index']);
  gulp.watch('./vendor.json', ['vendor']);
  gulp.watch('app/templates/**/*.html', function(){
    runSequence('templates', 'index');
  });
  gulp.watch('app/index.html', ['index']);
  gulp.watch(targetDir + '/**')
    .on('change', plugins.livereload.changed)
    .on('error', errorHandler);
});

// no-op = empty function
gulp.task('noop', function() {});

//testing
function testKarma(done) {
    var singleRun = true;
    if(args.debug) {
        singleRun = false;
    }
    new KarmaServer({
        configFile: __dirname + '/karma.conf.js',
        singleRun: singleRun
    }, function(exitStatus){
        done(exitStatus ? "There are failing unit tests" : undefined);
    }).start();

}

gulp.task('test-unit', function(done){
    var args = require('./utils.js').getArguments();
    args.isUnitTest = true;
    testKarma(done);
});

gulp.task('test-integration', function(done){
    var args = require('./utils.js').getArguments();
    args.isIntegrationTest = true;
    testKarma(done);
});

/*
 * This gets the path to protractor folder under node_modules
 */
function getProtractorBinary(binaryName){
    var pkgPath = require.resolve('protractor');
    var protractorDir = path.resolve(path.join(path.dirname(pkgPath), '..', 'bin'));
    return path.join(protractorDir, '/'+binaryName);
}

/**
 * This runs E2E testing after booting up
 * protractor and express servers
 */
gulp.task('test-e2e-with-servers', ['default'], function(){

  return new Promise(function(resolve, reject){
    /**
     * Steps:
     * 1. webdriver-manager update: to make sure the standalone 
     *      selenium driver is downloaded to be used
     * 2. webdriver-manager start: to start selenium driver
     * 3. run protractor test cases
     */
    var webdriverBinary = getProtractorBinary('webdriver-manager');

    var webdriverUpdate = spawn('node', [webdriverBinary, 'update'], {stdio: 'inherit'})
      .once('close', function(){
        var webdriverProcess = spawn('node', 
                        [webdriverBinary, 'start'], 
                        {stdio: 'inherit'});
     
        setTimeout(function(){

          var stream = getStreamE2E().on('end', function(){
                    webdriverProcess.kill();
                    webdriverUpdate.kill();
                    server.close();
                  });
          resolve(stream);
        }, 5000);
      });
  });
});

/**
 * This runs E2E testing after booting up
 * Express server
 */
gulp.task('test-e2e-with-express', ['default'], function(){
    return getStreamE2E();

});

/**
 * This only runs the test without booting 
 * Express and Protractor servers
 */
gulp.task('test-e2e', function(){
    return getStreamE2E();

});

/**
 * This returns the main gulp stream to run 
 * protractor test.
 * This is used by other gulp tasks such as
 * 'test-e2e', 'test-e2e-with-servers'
 */
function getStreamE2E() {
    var protractor = plugins.protractor.protractor;
    return gulp.src('test/e2e/**/*.spec.js').
              pipe(plugins.tokenReplace({tokens: getEnvConfig()})).
              pipe(gulp.dest(path.join(targetDir, 'test', 'e2e'))).
              pipe(protractor({
                configFile: './protractor.conf.js'
              }));
}


// our main sequence, with some conditional jobs depending on params
gulp.task('default', function(done) {
  runSequence(
    'clean',
    'iconfont',
    [
      'fonts',
      'templates',
      'styles',
      'images',
      'vendor'
    ],
    'index',
    build ? 'noop' : 'watchers',
    build ? 'noop' : 'serve',
    emulate ? ['ionic:emulate', 'watchers'] : 'noop',
    run ? 'ionic:run' : 'noop',
    done);
});

gulp.task('assets_resized', function() {
    runSequence('assets_resized_extra_small',
                'assets_resized_small',
                'assets_resized_medium',
                'assets_resized_large');
});

/**
 * This defines all the jobs for resizing assets
 * Key: Job name
 * Value: the maximum width
 * The end result will be gulp tasks in this format: assets_resized_{{key}}
 */
var assets_jobs = {
    'extra_small': 200,
    'small': 250,
    'medium': 600,
    'large': 700
};

_.each(assets_jobs, function(value, key){
    (function(){
        gulp.task('assets_resized_'+key, function(){
            return gulp.src('app/assets/resized/**/*.{png,jpg}')
                    .pipe(plugins.responsive({
                        '*.*': {
                            width: value
                        }
                    }))
                    .pipe(gulp.dest(path.join(targetDir, 'assets/resized/'+key)));
        });
    })();
});

/**
 * This loads the settings from ./environments/{{env}}.json
 * Also it overrides the IP address while under development mode
 */
function getEnvConfig() {
    console.log('Entered getEnvConfig()');
    var env = args.env;
    var envFolder = './environments';
    var defaultConfigFile = envFolder + '/default.json';
    var envConfigFile = envFolder + '/' + env +'.json';
    var defaultConfig = {}; // This is the content of the default config file
    var envConfig = require(envConfigFile); // This is the content 
                            // of the specific env config file
    console.log('Loaded envConfigFile for ' + env);
    console.log('Value of ' + env + '.json: ' + _getString(envConfig));

    if(fs.existsSync(defaultConfigFile)){
        defaultConfig = require(defaultConfigFile);
        console.log('Loaded default.json');
        console.log('Value of default.json: ' + _getString(defaultConfig));

    }

    //var res =  _.extend({}, defaultConfig, envConfig);
    var res =  _.deepExtend({}, envConfig, defaultConfig);
    console.log('Finished merging ' + env + '.json and default.json');
    console.log('Merged Value:' + _getString(envConfig));


    return res;

}

/*
 * This function is used to parse
 * Map object
 */
function _getString(object) {
    var s = '';
    _.each(object, function(item, key) {
        if (s === '') {
            s = s + key + ':' + JSON.stringify(item);
        
        } else {
            s = s + '\n\t' + key + ':' + JSON.stringify(item);
        }
    });
    return s;
}


