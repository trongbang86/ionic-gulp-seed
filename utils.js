/**
 * This utility is shared amongst gulp tasks
 * and Karma config file
 */

module.exports = (function() {
    var args = getArguments();
    return {
        getArguments: function() {
            return args;
        } 
    }
})();

/**
 * Parse arguments
 */
function getArguments() {
    var args = require('yargs')
        .alias('e', 'emulate')
        .alias('b', 'build')
        .alias('s', 'source')
        .alias('r', 'run')
        // remove all debug messages (console.logs, alerts etc) from release build
        .alias('release', 'strip-debug')
        .default('build', false)
        .default('port', 9000)
        .default('source', false)
        .default('strip-debug', false)
        .default('env', 'development')
        .default('debug', false)
        .argv;
    return args;
}

