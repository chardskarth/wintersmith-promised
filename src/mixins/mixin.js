let assert = require('assert');
let _ = require('lodash');

function _isFunction(toCheck){
  return toString.call(toCheck) === "[object Function]";
}

module.exports = function(mixin, subtype, mixinOpts, isPrototype){
  mixinOpts = mixinOpts ? _.cloneDeep(mixinOpts) : {};

  assert(_isFunction(mixin), "mixin should be a function or class");
  let onMixinInheriting = mixin.onMixinInheriting || mixinOpts.onMixinInheriting;
  assert(onMixinInheriting, "onMixinInheriting should be implemented");
  
  onMixinInheriting(subtype, mixinOpts);
  let name = mixin.name;
  let mixinInstance;
  let instancePropertyName = `__${name}`;
  let inheritTarget;
  Object.defineProperty(subtype, instancePropertyName, {
    get(){
      if(!mixinInstance){
        mixinInstance = new mixin(this, mixinOpts);
      }
      return mixinInstance;
    }
  });
}