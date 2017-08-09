module.exports = function (winstonLogger, winstonOptions) {
  let chalk = require('chalk');
  let winston = require('winston');
  let util = require('util');

  class CustomLogger extends winston.Transport{
    constructor(options){
      super(options);
      this.name = 'cli';
      this.quiet = options.quiet || false;
    }
    log(level, msg, meta){
      var c, key, pval, stack, value;
      if (level === 'error') {
        process.stderr.write("\n  " + (chalk.red('error')) + " " + msg + "\n");
        if (this.level === 'verbose' && (meta != null)) {
          if (meta.stack != null) {
            stack = meta.stack.substr(meta.stack.indexOf('\n') + 1);
            process.stderr.write(stack + "\n\n");
          }
          for (key in meta) {
            value = meta[key];
            if (key === 'message' || key === 'stack') {
              continue;
            }
            pval = util.inspect(value, false, 2, true).replace(/\n/g, '\n    ');
            process.stderr.write("    " + key + ": " + pval + "\n");
          }
        } else {
          process.stderr.write("\n");
        }
      } else if (!this.quiet) {
        if (level !== 'info') {
          c = level === 'warn' ? 'yellow' : 'grey';
          msg = (chalk[c](level)) + " " + msg;
        }
        if (Object.keys(meta).length > 0) {
          msg += util.format(' %j', meta);
        }
        process.stdout.write("  " + msg + "\n");
      }
      this.emit('logged');
      return true;
    }
  }

  winstonLogger.add(CustomLogger, winstonOptions);
  winstonLogger.remove(winston.transports.Console, winstonOptions);
  // winstonLogger.transports.CustomLogger = CustomLogger;
}