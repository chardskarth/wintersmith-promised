'use strict';

let assert = require('assert');
let Promise = require('bluebird');
let {isFunction: _isFunction, isObject: _isObject} = require('./injector-util');

function pushArrInvokePromise(fnToInvoke, dependencyName){
  dependencyName = dependencyName.trim();
  let defer = Promise.defer();
  let bindedInvokeFn = function(defer, fnToInvoke, dependencyName){
    if(!defer.promise.isPending()){
      return;
    }
    try{
      let result = this.invoke(fnToInvoke);
      defer.resolve(result);
      if(dependencyName){
        this.setDependencies({[dependencyName]: result});
      }
    } catch(err){
      if(!err.message.includes("unknown parameter: ")
          || err.injectorInstanceId != this.instanceId){
        defer.reject(err);
      }
    }
  }.bind(this, defer, fnToInvoke, dependencyName);
  let retVal = {defer, bindedInvokeFn, fnToInvoke, dependencyName};
  getArrInvokePromise.call(this).push(retVal);
  return retVal;
}

function getArrInvokePromise(){
  if(!this.__arrInvokePromise){
    this.__arrInvokePromise = [];
  }
  return this.__arrInvokePromise;
}

function execArrInvokePromise(){
  let arrInvoke = getArrInvokePromise.call(this);
  arrInvoke
    .filter(({defer}) => {
      return defer.promise.isPending();
    })
    .forEach(({bindedInvokeFn}) => {
      bindedInvokeFn();
    });
}

function initArrInvoker(){
  if(!this.__initializedAutoInvoker){
    this.on("dependencyAdded", execArrInvokePromise.bind(this));
    this.__initializedAutoInvoker = true;
  }
}

function assertNonExistingInArr(key){
  let arrInvoke = getArrInvokePromise.call(this);
  let keys = arrInvoke.map(({dependencyName}) => dependencyName);
  let isExisting = keys.indexOf(key) != -1;
  if(isExisting){
    throw this._createError(`${key} already existing in autoInvoke`);
  }
}

function assertLinearDependency(fnToInvoke, dependencyName){
  // parameters of the currently being invoked function
  let fnToInvokeParamsArr = this._getParamsName(fnToInvoke);
  // arrays previously autoInvoked
  let arrInvoke = getArrInvokePromise.call(this);
  fnToInvokeParamsArr.forEach((fnToInvokeParam) => {
    if(fnToInvokeParam === dependencyName){
      throw this._createError(`self dependency detected: ${dependencyName}`);
    }
    let fnDependent = arrInvoke
      .find(({dependencyName: fnDependentName}) => fnToInvokeParam === fnDependentName);
    if(!fnDependent){
      return;
    }
    let {fnToInvoke} = fnDependent;
    let paramsFnDependent = this._getParamsName(fnToInvoke);
    let isNotExisting = !paramsFnDependent.includes(dependencyName);
    assert(isNotExisting
      , `circular dependency detected. ${dependencyName} > ${fnToInvokeParam} > ${dependencyName}`);
  });
}

module.exports = function(InjectorClass){
  InjectorClass.prototype.autoInvoke = function(fnToInvoke, dependencyName){
    dependencyName = dependencyName || "";
    assert(_isFunction(fnToInvoke), "invoke param should be a function");
    assert.equal(typeof dependencyName, "string", "dependencyName should be a string");
    if(dependencyName){
      this._assertNonExisting([dependencyName]);
      assertNonExistingInArr.call(this, dependencyName);
      assertLinearDependency.call(this, fnToInvoke, dependencyName);
    }
    let {bindedInvokeFn, defer} = pushArrInvokePromise.call(this, fnToInvoke, dependencyName);
    initArrInvoker.call(this);
    //initially try to invoke function
    bindedInvokeFn();
    return defer.promise;
  }

  InjectorClass.prototype.assertInvokeResolved = function(){
    let arrInvokePromise = getArrInvokePromise.call(this);
    let pendingCount = arrInvokePromise
      .filter(({defer, dependencyName}) => {
        return defer.promise.isPending();
      });
    let failedCount = arrInvokePromise
      .filter(({defer, dependencyName}) => {
        return defer.promise.isRejected();
      });
    let errorMessage = "";
    pendingCount.forEach(({fnToInvoke, dependencyName}) => {
      errorMessage += `${fnToInvoke.name || dependencyName || '<unknown function>'} not yet resolved. missing dependencies: `;
      let paramsArr = this._getParamsName(fnToInvoke);
      let missingDependencies = paramsArr.filter(x => {
        return !this._dependencies[x]
      });
      errorMessage += `${missingDependencies.join(", ").trim()}; `;
    });

    failedCount.forEach(({defer, fnToInvoke, dependencyName}) => {
      errorMessage += `${fnToInvoke.name || dependencyName || '<unknown function>'} failed. ${defer.promise.reason()};`;
      // throw defer.promise.reason();
    });

    if(errorMessage){
      throw this._createError(errorMessage);
    }
  }
}