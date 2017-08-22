"use strict";
let Promise = require('bluebird');
let _ = require('lodash');
let minimatch = require('minimatch');
let chalk = require('chalk');
let assert = require('assert');


module.exports = function(logger, util, ReplPlugin){
  let {readDirectoryAndResolve} = util;
  let registeredReplFunctions = {};
  let replPlugins = [];
  let replActions = {};

  let mainRetVal = {}
  function registerFunctionToMainRetVal(obj){
    _.forOwn(obj, function(value, key){
      mainRetVal[key] = value.bind(mainRetVal)
    });
  }

  let loadReplPlugins = function(replContext){
    let uniqueReplPlugins = _.uniq(_.values(registeredReplFunctions))
      .map(x => {
        let name = x.name;
        let instance = new x(replContext);
        return {name, instance}
      })
      .reduce((prev, curr) => {
        let {name, instance} = curr;
        prev[name] = instance;
        return prev;
      }, {});
    let keysToRegister = Object.getOwnPropertyNames(registeredReplFunctions);
    for(let ii = 0; ii < keysToRegister.length; ii++){
      let key = keysToRegister[ii];
      let pluginName = registeredReplFunctions[key].name;
      let pluginInstance = uniqueReplPlugins[pluginName];
      replActions[key] = replContext[key] = pluginInstance[key].bind(pluginInstance);
    }
  }

  let registerReplPlugin = function(plugin){
    assert(plugin.prototype instanceof ReplPlugin
      , "registerReplPlugin expects a Class that inherits ReplPlugin");
        
    let registeredReplPlugins = _.map(_.values(registeredReplFunctions), 'name');
    assert(!registeredReplPlugins.includes(plugin.name)
      , `registerReplPlugin already registered ${plugin.name}`);

    logger.verbose("registering repl plugin " + plugin.name);
    //keysToRegister
    let keysToRegister = Object.getOwnPropertyNames(plugin.prototype);
    keysToRegister = keysToRegister
      .filter(x => x !== "constructor");
    let registeredKeys = Object.getOwnPropertyNames(registeredReplFunctions);
    let existingKeys = registeredKeys
      .filter(x => keysToRegister.includes(x));

    assert.equal(existingKeys.length, 0
        , `registerReplPlugin already registered: ${existingKeys.join(', ')}`);
    keysToRegister.forEach(x => {
      registeredReplFunctions[x] = plugin;
    });
  }

  let repl = function(key){
    return replActions[key]();
  }

  registerFunctionToMainRetVal({
    loadReplPlugins
    , registerReplPlugin
    , repl
  });

  return mainRetVal;
}