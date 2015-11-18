var path 		= require('path'),
 	KarmaServer = require('karma').Server,
 	spawn 		= require('child_process').spawn,
 	Promise 	= require('bluebird');

/**
 * Gulp tasks for test
 * @param gulp the existing gulp instance
 * @param plugins the gulp-load-plugins
 */
module.exports = function(gulp, plugins){

	//testing
	gulp.task('test-unit', function(done){
	  new KarmaServer({
	    configFile: __dirname + '/../karma.conf.js',
	    singleRun: true
	  }, done).start();
	});

	/*
	 * This gets the path to protractor folder under node_modules
	 */
	function getProtractorBinary(binaryName){
	    var pkgPath = require.resolve('protractor');
	    console.log(pkgPath);
	    var protractorDir = path.resolve(path.join(path.dirname(pkgPath), '..', 'bin'));
	    return path.join(protractorDir, '/'+binaryName);
	}

	gulp.task('test-e2e', ['default'], function(){
	  var protractor = plugins.protractor.protractor;

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

	          var stream = gulp.src('test/e2e/**/*.spec.js').
	                  pipe(protractor({
	                    configFile: './protractor.conf.js'
	                  })).on('end', function(){
	                    webdriverProcess.kill();
	                    webdriverUpdate.kill();
	                    gulp.__server__.close();
	                  });
	          resolve(stream);
	        }, 5000);
	      });
	  });
	});
};