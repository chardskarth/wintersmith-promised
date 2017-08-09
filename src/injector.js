let Promise = require('bluebird');
let assert = require('assert');

function _isFunction(toCheck){
  return toString.call(toCheck) === "[object Function]";
}

function _isObject(obj) {
  var typeOf = typeof obj;
  return obj && typeOf === "object" && !Array.isArray(obj);
}

class Injector{
  constructor(dependencies, options){
    this._dependencies = dependencies || {} ;
    this._options = options;
  }
  
  setDependency(key, value){
    assert.equal(typeof key, "string", 'key must be a string');
    this._dependencies[key] = value;
  }

  setDependencies(keyValue){
    assert(_isObject(keyValue), 'keyValue must be an object');
    let keys = Object.keys(keyValue);
    let existingKeys = keys.filter(k => typeof this._dependencies[k] !== 'undefined');
    if(existingKeys.length){
      throw new Error(`${existingKeys.join(', ')} already existing`);
    }
    Object.assign(this._dependencies, keyValue);
  }

  getDependencies(){
    let keys = [].slice.call(arguments);
    let isEveryArgsString = keys.every(x => typeof x === "string");
    if(!isEveryArgsString){
      throw new Error("get expects strings only");
    }
    let retVal = keys.map(k => this._dependencies[k]);
    let notExistingKeys = retVal
      .filter(x => typeof x === "undefined")
      .map((x, i) => keys[i]);

    if(notExistingKeys.length){
      throw new Error(`${notExistingKeys.join(', ')} not yet set`);
    }
    return retVal.length == 1 ? retVal[0] : retVal;
  }

  _getParamsArr(funcToInvoke) {
    let retValParamsArr = []
    let paramRegExp = /\((.|\s)*?\)/;
    let funcString = typeof funcToInvoke === "function" ? funcToInvoke.toString() : funcToInvoke;
    let paramsStrArr = funcString.match(paramRegExp)[0].replace(/[()]/gi,'').split(",");
    for(let i = 0; i < paramsStrArr.length; i++){
      let dependencyName = paramsStrArr[i].trim();
      if(!dependencyName){
        continue;
      }
      let toInject = this._dependencies[dependencyName];
      if(typeof toInject === "undefined"){
        throw new Error(`unknown parameter: ${dependencyName}`);
      } else {
        retValParamsArr.push(toInject);
      }
    }
    return retValParamsArr;
  }

  invoke(functionToInvoke){
    assert(_isFunction(functionToInvoke), "invoke param should be a function");
    let params = this._getParamsArr(functionToInvoke);
    return functionToInvoke.apply(null, params);
  }
}

module.exports = Injector;