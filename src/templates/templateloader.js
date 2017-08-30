"use strict";

let Promise = require('bluebird');
let _ = require('lodash');
let micromatch = require('micromatch');
let chalk = require('chalk');


module.exports = function(logger, util, templatesPath){
  let {readDirectoryAndResolve} = util;
  let templates = {};
  let templatePlugins = [];
  var micromatchOptions = {
    dot: false
  };

  let mainRetVal = {}
  function registerFunctionToMainRetVal(obj){
    _.forOwn(obj, function(value, key){
      mainRetVal[key] = value.bind(mainRetVal)
    });
  }

  let loadTemplate = function(filepath){
    return Promise.coroutine(function* (){
      try{
        let plugin = templatePlugins.find(function({pattern}){
          return micromatch.isMatch(filepath.relative, pattern, micromatchOptions)
        })
        if(!plugin) {
          logger.info(`skipping template: ${chalk.bold(filepath.relative)}`)
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

  let loadTemplates = function(){
    return Promise.coroutine(function* (){
      let filenames = yield readDirectoryAndResolve(templatesPath, true);
      return Promise.all(filenames.map(loadTemplate))
    })();
  }

  let getTemplates = function(){
    return Promise.coroutine(function* (){
      if(_.isEmpty(templates)){
        yield loadTemplates();
      }
      return templates; 
    })();
  }

  let registerTemplatePlugin = function(pattern, plugin){
    logger.verbose("registering template plugin " + plugin.name + " that handles: " + pattern);
    return templatePlugins.push({
      pattern: pattern,
      "class": plugin
    });
  }

  registerFunctionToMainRetVal({
    getTemplates
    , registerTemplatePlugin
  });

  return mainRetVal;
}