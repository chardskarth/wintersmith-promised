let assert = require('assert');
let Promise = require('bluebird');
let knownStringerImplementors = {};

function _isFunction(toCheck){
  return toString.call(toCheck) === "[object Function]";
}

class Stringer{
  constructor(baseObject, options){
    let {fromString: fromStringFunc, toString: toStringFunc} = options;
    assert(_isFunction(fromStringFunc));
    assert(_isFunction(toStringFunc));
    let constructorName = Object.getPrototypeOf(baseObject).constructor.name;
    this.baseObject = baseObject;
    this.constructorName = constructorName;
    this.fromStringFunc = fromStringFunc;
    this.toStringFunc = toStringFunc;
  }
  static toString(objectToString){
    return Promise.coroutine(function* (){
      let stringerInstance = objectToString.__Stringer;
      if(!stringerInstance){
        throw new Error("Object is not using Stringer mixin");
      }
      var toJson = {
        ConstructorName: stringerInstance.constructorName,
        Obj: stringerInstance.toStringFunc.call(stringerInstance.baseObject, stringerInstance.baseObject)
      }
      toJson.Obj = yield Promise.cast(toJson.Obj);
      return JSON.stringify(toJson);
    })();
  }
  static fromString(stringToObject, context){
    let {ConstructorName, Obj} = JSON.parse(stringToObject)
    let fromStringFunc = knownStringerImplementors[ConstructorName];
    if(!fromStringFunc){
      throw new Error(`Constructor ${ConstructorName} is not a known Stringer mixin implementor`);
    }
    return fromStringFunc.call(context, Obj);
  }
}
Stringer.onMixinInheriting = function(subtype, mixinOpts){
  let {fromString} = mixinOpts;
  knownStringerImplementors[subtype.name] = fromString;
}

module.exports = Stringer;