let util = require('util');
let Promise = require('bluebird');
let {commonUsage, configDefaults} = require('./common');
let usage = `
  usage: wintersmith preview [options]
  options:
    -p, --port [port]             port to run server on (defaults to ${ configDefaults.port })
    -H, --hostname [host]         host to bind server onto (defaults to INADDR_ANY)
    ${ commonUsage }
    all options can also be set in the config file
  examples:
    preview using a config file (assuming config.json is found in working directory):
    $ wintersmith preview
`;

let options = {
  string: ['port', 'hostname'],
  alias: {
    port: 'p',
    hostname: 'H'
  }
};

let preview = function(argv, env) {
  let {logger} = env;
  return Promise.coroutine(function*(){
    logger.info('starting preview server');
    try{
      yield env.preview()
      logger.info('preview started');
    } catch(error){
      logger.error(error.message, error);
      return process.exit(1);
    }
  })();
};

module.exports = preview;
module.exports.usage = usage;
module.exports.options = options;
