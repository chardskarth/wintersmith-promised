const CONFIG_PATH = "config.json"
let _config = require('./config') 
let cwdutil = require('./cwdutil') 
let logger = require('./logger')
let path = require('path');
let assert = require('assert');
let EventEmitter = require('events');
let {defaultsDeep} = require('lodash');

function _isObject(obj) {
  var typeOf = typeof obj;
  return typeOf === "object" && !Array.isArray(obj);
}

class Environment extends EventEmitter{
  constructor(){
    super();
    // https://stackoverflow.com/questions/18541940/map-vs-object-in-javascript
    let map = this.keyValueMap = new Map();
    this.delete = map.delete.bind(map);
    this.keys = map.keys.bind(map);
    this.values = map.values.bind(map);
    this.has = map.has.bind(map);
  }
  get(){
    let keys = [].slice.call(arguments);
    let isEveryArgsString = keys.every(x => typeof x === "string");
    if(!isEveryArgsString){
      throw new Error("get expects strings only");
    }
    let retVal = keys.map(k => this.keyValueMap.get(k));
    let notExistingKeys = retVal
      .filter(x => typeof x === "undefined")
      .map((x, i) => keys[i]);

    if(notExistingKeys.length){
      throw new Error(`${notExistingKeys.join(', ')} not yet set`);
    }
    return retVal.length == 1 ? retVal[0] : retVal;
  }
  set(key, value){
    //if an object is passed, it should work like destructuring assignment
    let keys, keyValue;
    let self = this;
    if(_isObject(key)){
      keys = Object.keys(key);
      keyValue = key;
    } else if(typeof key === 'string'){
      keys = [key];
      keyValue = {[key]: value};
    } else {
      throw new Error('set must be called with set(key, value) or set({key: value})');
    }
    let existingKeys = keys.filter(k => self.has(k));
    if(existingKeys.length){
      throw new Error(`${existingKeys.join(', ')} already existing`);
    }
    Object.keys(keyValue).forEach((k) => {
      self.keyValueMap.set(k, keyValue[k]);
    });
  }

  static createInstance(envPath, onBeforeInit){
    envPath = envPath || process.cwd();
    onBeforeInit = onBeforeInit || function(){};
    let util = cwdutil(envPath);
    let {readFileCWD, isFileExist, requireCWD} = util;
    let configPath = CONFIG_PATH;
    if(!isFileExist(configPath)){
      //if config.json is not existing, try config.js
      let {dir, root, name} = path.parse(configPath);
      let ext = ".js";
      configPath = path.format({dir, root, name, ext});
      if(!isFileExist(configPath)){
        throw new Error("config(.json|.js) must exist in path")
      }
    }
    let configOpts = JSON.parse(readFileCWD(configPath));
    let config = Environment._mergeOverrideConfigs(configOpts, readFileCWD);
    config = _config.createInstance(config);
    
    let newEnvironment = new Environment();
    newEnvironment.config = config;
    newEnvironment.cwdutil = util;
    newEnvironment.logger = logger;
    newEnvironment.require = requireCWD;

    onBeforeInit(newEnvironment);
    
    //initialize environment if it is specified
    (function init(){
      if(!newEnvironment.config.initPath){
        newEnvironment.logger.debug("no initpath found for environment");
        return;
      }
      let initFuncPath = newEnvironment.config.initPath;
      try{
        let initFunc = newEnvironment.require(initFuncPath)
        if(typeof initFunc !== "function"){
          throw new Error("Environment's init should be a path to a function")
        }
        initFunc(newEnvironment);
      } catch(err){
        throw err; //might want to handle in the future
      }
    })();
    return newEnvironment;
  }
  
  static _mergeOverrideConfigs(config, readFileCWD){
    if(config.configOverrides && config.configOverrides.length){
      //convert array of config file paths to array of JSON objects
      //if file is not existing, it will not have any effect
      let configOverrides = config.configOverrides
        .map(x => {
          try{
            return JSON.parse(readFileCWD(x))
          } catch(err){
            if(err.message.indexOf("ENOENT") == -1){
              throw err;
            } else {
              return ""
            }
          }
        })
        .filter(x => x);
      configOverrides.push(config)

      return defaultsDeep.apply(null, configOverrides);
    } else {
      return config;
    }
  }
}

module.exports = Environment;