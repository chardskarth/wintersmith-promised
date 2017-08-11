const repl = require('repl');
const chalk = require('chalk');


module.exports = function(util, cwdutil, contentsPath){
  let Injector = cwdutil.requireCWD("./src/injector");

  let writer = function(output){
    return chalk.bold(output);
  }
  
  let replInstance = repl.start({writer});
  let replContext = replInstance.context;

  let injectorInstance = new Injector({replContext});
  injectorInstance.invoke(require("./checknew-reload"));
}