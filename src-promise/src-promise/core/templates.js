var fs = require('fs');
var minimatch = require('minimatch');
var path = require('path');
var Promise = require('bluebird');
var chalk = require('chalk');

var {extend, readdirRecursiveSync} = require('./utils');

class TemplatePlugin{
  render(){
    throw new Error('Not implemented.');
  }
  static fromFile(){
    throw new Error('Not implemented.');
  }
}
var loadTemplates = function(env) {
  var templates = {};
  var resolveFilenames = function(filenames){
    return filenames.map((relative) => {
      return {
        full: path.join(env.templatesPath, relative),
        relative
      }
    });
  }

  var loadTemplate = function(filepath){
    return Promise.coroutine(function*(){
      try{
        var plugin = null;
        for (var i = env.templatePlugins.length - 1; i >= 0; i--) {
          var templatePlugin = env.templatePlugins[i];
          if(minimatch(filepath.relative, templatePlugin.pattern)){
            plugin = templatePlugin;
            break;
          }
        }
        if(!plugin) {
          env.logger.info(`skipping template: ${chalk.bold(filepath.relative)}`)
        } else {
          var template = plugin["class"].fromFile(filepath);
          template = yield Promise.cast(template);
          templates[filepath.relative] = template
          return template;
        }
      } catch(error){
        error.message = "template " + filepath.relative + ": " + error.message;
        throw error;
      }
    })();
  }
  var filenames = resolveFilenames(readdirRecursiveSync(env.templatesPath));
  return Promise.all(filenames.map(loadTemplate))
    .then(() => templates);
}

module.exports = {
  TemplatePlugin,
  loadTemplates
};
