const repl = require('repl');
const chalk = require('chalk');


module.exports = function(util, cwdutil, contentsPath, logger, contentLoader){
  let Injector = cwdutil.requireCWD("./src/modules/injector/injector");
  let { contentsLookupMap, loadContentPlugin } = contentLoader;

  let writer = function(output){
    return chalk.bold(output);
  }
  
  let replInstance = repl.start({writer});
  let replContext = replInstance.context;
  
  let injectorInstance = new Injector({replContext, contentsPath, logger
    , contentsLookupMap, loadContentPlugin});
  injectorInstance.invoke(require("./check-contents"));
}