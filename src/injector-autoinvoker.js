let assert = require('assert');
let Promise = require('bluebird');
let {isFunction: _isFunction, isObject: _isObject} = require('./injector-util');

function pushArrInvokePromise(fnToInvoke, dependencyName){
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
      if(err.message.indexOf("unknown parameter: ") == -1){
        defer.reject(err);
      }
    }
  }.bind(this, defer, fnToInvoke, dependencyName);
  bindedInvokeFn();
  getArrInvokePromise.call(this).push({defer, bindedInvokeFn, fnToInvoke, dependencyName});
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
      // process.nextTick(bindedInvokeFn);
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
    throw new Error(`${key} already existing in autoInvoke`);
  }
}

function assertLinearDependency(fnToInvoke, dependencyName){
  // parameters of the currently being invoked function
  let fnToInvokeParamsArr = this._getParamsName(fnToInvoke);
  // arrays previously autoInvoked
  let arrInvoke = getArrInvokePromise.call(this);
  fnToInvokeParamsArr.forEach((fnToInvokeParam) => {
    if(fnToInvokeParam === dependencyName){
      throw new Error(`self dependency detected: ${dependencyName}`);
    }
    let fnDependent = arrInvoke
      .find(({dependencyName: fnDependentName}) => fnToInvokeParam === fnDependentName);
    if(!fnDependent){
      return;
    }
    let {fnToInvoke} = fnDependent;
    let paramsFnDependent = this._getParamsName(fnToInvoke);
    let isNotExisting = !paramsFnDependent.includes(dependencyName);
    assert(isNotExisting, `circular dependency detected. ${dependencyName} > ${fnToInvokeParam} > ${dependencyName}`);
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
    pushArrInvokePromise.call(this, fnToInvoke, dependencyName);
    initArrInvoker.call(this);
  }

  InjectorClass.prototype.assertInvokeResolved = function(){
    let unresolvedCount = getArrInvokePromise.call(this)
      .filter(({defer}) => {
        return defer.promise.isPending();
      });
    let errorMessage = "";
    unresolvedCount.forEach(({fnToInvoke, dependencyName}) => {
      errorMessage += `${dependencyName} not yet resolved. missing dependencies: `;
      let paramsArr = this._getParamsName(fnToInvoke);
      let missingDependencies = paramsArr.filter(x => {
        return !this._dependencies[x]
      });
      errorMessage += `${missingDependencies.join(", ").trim()}; `;
    });
    if(errorMessage){
      throw new Error(errorMessage);
    }
  }



}