let chalk = require('chalk');
let parseArgv = require('minimist');
let path = require('path');
let Promise = require('bluebird');
let {extendOptions, commonOptions, configDefaults} = require('./common');

// logger = require('./../core/logger').logger;

let usage = `
  usage: wintersmith [options] [command]
  commands:
    ${ chalk.bold('build') } [options] - build a site
    ${ chalk.bold('preview') } [options] - run local webserver
    ${ chalk.bold('new') } <location> - create a new site
    ${ chalk.bold('plugin') } - manage plugins
    also see [command] --help
  global options:
    -v, --verbose   show debug information
    -q, --quiet     only output critical errors
    -V, --version   output version and exit
    -h, --help      show help
`;

Promise.config({
  longStackTraces: true
});

process.on('uncaughtException', function(error) {
  console.log("uncaught exception");
  console.log(error);
  return process.exit(1);
});
process.on("unhandledRejection", function(reason, promise) {
  // See Promise.onPossiblyUnhandledRejection for parameter documentation
  console.log("unhandled rejection");
  console.log(reason);
  return process.exit(1);
});

globalOptions = {
  boolean: ['verbose', 'quiet', 'version', 'help'],
  alias: {
    verbose: 'v',
    quiet: 'q',
    version: 'V',
    help: 'h'
  }
};

function loadEnv(argv) {
  /* creates a new wintersmith environment
      options are resolved with the hierarchy: argv > configfile > defaults
    */
  let workDir = path.resolve(argv.chdir || process.cwd());
  let configPath = path.join(workDir, argv.config);
  //prepare cli opts
  let cliOpts = {};
  for (let key in argv) {
    value = argv[key];
    if (key.length == 1) {// do not include the shorthands
      continue;
    }
    if (key === 'port') {
      value = Number(value);
    }
    if (key === 'ignore' || key === 'require' || key === 'plugins') {
      value = value.split(',');
      if (key === 'require') {
        let reqs = {};
        for(let i = 0; i < value.length; i++){
          let [alias, module] = value[i].split(':');
          if(module == null){
            module = alias;
            alias = module.replace(/\/$/, '').split('/').slice(-1);
          }
          reqs[alias] = module;
        }
        value = reqs;
      }
    }
    cliOpts[key] = value;
  }
  //config overriding in the following order
  let env = require("./../index")(workDir, configDefaults, configPath, cliOpts);
  return env;
};

function main(argv) {
  var cmd, error, opts;
  opts = parseArgv(argv, globalOptions);
  cmd = opts._[2];
  if (cmd != null) {
    try {
      cmd = require("./" + cmd);
    } catch (error1) {
      error = error1;
      if (error.code === 'MODULE_NOT_FOUND') {
        console.log("'" + cmd + "' - no such command");
        process.exit(1);
      } else {
        throw error;
      }
    }
  }
  if (opts.version) {
    console.log(require('./version'));
    process.exit(0);
  }
  if (opts.help || !cmd) {
    console.log(cmd ? cmd.usage : usage);
    process.exit(0);
  }

  let loggerOpts = {}
  if (opts.verbose) {
    if (argv.indexOf('-vv') >= 0) {
      loggerOpts.level = 'silly';
    } else {
      loggerOpts.level = 'verbose';
    }
  }
  if (opts.quiet) {
    loggerOpts.quiet = true;
  }

  if (cmd) {
    let cmdOptions = {};
    extendOptions(cmdOptions, globalOptions);
    extendOptions(cmdOptions, commonOptions);
    extendOptions(cmdOptions, cmd.options);
    opts = parseArgv(argv, cmdOptions);
    let env = loadEnv(opts);
    let {logger, cwdutil} = env;
    
    let customTransports 
        = cwdutil.requireCWD("./src/winston-logger-transport")(logger, loggerOpts);
    return cmd(opts, env);
  }
};

module.exports.main = main;
