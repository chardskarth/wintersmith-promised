var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var {fileExistsSync} = require('./../core/utils')
var {commonUsage} = require('./common')
var {logger} = require('./../core/logger');
var Promise = require("bluebird");
var usage = `
  usage: wintersmith build [options]
  options:
    -o, --output [path]           directory to write build-output (defaults to ./build)
    -X, --clean                   clean before building (warning: will recursively delete everything at output path)
    ${ commonUsage }
    all options can also be set in the config file
  examples:
    build using a config file (assuming config.json is found in working directory):
    $ wintersmith build
    build using command line options:
    $ wintersmith build -o /var/www/public/ -T extra_data.json -C ~/my-blog
    or using both (command-line options will override config options):
    $ wintersmith build --config another_config.json --clean
`;

var options = {
  alias: {
    output: 'o',
    clean: 'X'
  },
  boolean: ['clean'],
  string: ['output']
};

var build = function(argv, env){
  return Promise.coroutine(function*(){
    var start = new Date();
    logger.info('building site');
    var _prepareOutputDir = function(env, callback) {
      var exists, outputDir;
      outputDir = env.resolvePath(env.config.output);
      exists = fileExistsSync(outputDir);
      if (exists) {
        if (argv.clean) {
          logger.verbose("cleaning - running rimraf on " + outputDir);
          return async.series([
            function(callback) {
              return rimraf(outputDir, callback);
            }, function(callback) {
              return fs.mkdir(outputDir, callback);
            }
          ], callback);
        } else {
          return callback();
        }
      } else {
        logger.verbose("creating output directory " + outputDir);
        return fs.mkdir(outputDir, callback);
      }
    };
    var prepareOutputDir = Promise.promisify(_prepareOutputDir);
    // let env = loadEnv(argv);
    yield prepareOutputDir(env);
    yield env.build();
    var stop = new Date();
    var delta = stop - start;
    logger.info("done in " + (chalk.bold(delta)) + " ms\n");
    return process.exit();
  })()
  .catch((error) =>{
    logger.error(error.message, error);
     process.exit(1);
  });
}

module.exports = build;
module.exports.usage = usage;
module.exports.options = options;
