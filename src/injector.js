let assert = require('assert');
let injectorAutoInvoker = require('./injector-autoinvoker');
let EventEmitter = require('events');
let {isFunction: _isFunction, isObject: _isObject} = require('./injector-util');

class Injector extends EventEmitter{
  constructor(dependencies, options){
    super();
    this._dependencies = dependencies || {} ;
    this._options = options;
  }

  _assertNonExisting(keys){
    let existingKeys = keys.filter(k => typeof this._dependencies[k] !== 'undefined');
    if(existingKeys.length){
      throw new Error(`${existingKeys.join(', ')} already existing`);
    }
  }

  setDependencies(keyValue){
    assert(_isObject(keyValue), 'keyValue must be an object');
    let keys = Object.keys(keyValue);
    this._assertNonExisting(keys);
    Object.assign(this._dependencies, keyValue);
    this.emit('dependencyAdded');
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

  _getParamsName(fnToInvoke){
    let paramRegExp = /\((.|\s)*?\)/;
    let funcString = typeof fnToInvoke === "function" ? fnToInvoke.toString() : fnToInvoke;
    return funcString
      .match(paramRegExp)[0]
      .replace(/[()]/gi,'')
      .split(",")
      .map(x => x.trim());
  }

  _getParamsArr(fnToInvoke) {
    let retValParamsArr = []
    let paramsStrArr = this._getParamsName(fnToInvoke);
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

  invoke(fnToInvoke){
    assert(_isFunction(fnToInvoke), "invoke param should be a function");
    let params = this._getParamsArr(fnToInvoke);
    return fnToInvoke.apply(null, params);
  }
}
injectorAutoInvoker(Injector);
module.exports = Injector;