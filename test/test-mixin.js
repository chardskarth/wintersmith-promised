let chai = require("chai");
let expect = chai.expect;
let {shouldThrow} = require('./util');
let assert = require('assert');
let Promise = require('bluebird');

let mymixin = require("./../src/mixins/mixin");

describe("Mixin", function(){
  function getTestParams(){
    class test{}
    function test2(){}
    return {test, test2};
  }
  it("Accepts functions and classes only", function(){
    ["string", {}, true, 1, 1.5]
      .forEach(param => {
        shouldThrow(function(){
          mymixin(param, {});
        }, function(err){
          expect(err.message).to.equal("mixin should be a function or class");
        });
      });
  });
  it("Assert 'name' and 'onMixinInheriting' be implemented (static)", function(){
    let {test, test2} = getTestParams();
    [ test, test2 ].forEach(param => {
        shouldThrow(function(){
          mymixin(param, {});
        }, function(err){
          expect(err.message)
              .to.equal("onMixinInheriting should be implemented");
        });
      });
  });
  it("Create instance of mixin at __${mixinName}", function(){
    let {test, test2} = getTestParams();
    [ test, test2 ].forEach((param) => {
      param.onMixinInheriting = function(){}
      let obj = {};
      mymixin(param, obj);
      expect(obj).to.have.property(`__${param.name}`);
    });
  });
  it("onMixinInheriting is called", function(){
    return Promise.coroutine(function* (){
      let {test, test2} = getTestParams();
      let objs = yield Promise.map([ test, test2 ], (param) => {
        let defer = Promise.defer();
        param.onMixinInheriting = function(){
          obj.gotHere = true;
          defer.resolve(obj);
        }
        let obj = {};
        mymixin(param, obj);
        return defer.promise;
      });
      objs.every(x => expect(x.gotHere).to.be.true);
    })();
  });
  it("Should instantiate mixin instance", function(){
    let {test: renamedTest, test2: renamed} = getTestParams();
    renamedTest.onMixinInheriting = function(){}
    let obj = {};
    mymixin(renamedTest, obj);
    expect(obj).to.have.property(`__test`);

    renamed.onMixinInheriting = function(){}
    obj = {};
    mymixin(renamed, obj);
    expect(obj).to.have.property(`__test2`);
  });
  it("Instantiated mixin instance. Should clone options from outside call." 
      + "But maitain the same option instance to customMixin constructor"
      , function(){
    let myObj = {};
    let myOptions = {a: 1};
    let optsOnMixinInheriting;
    function CustomMixin(object, options){
      this.isTrue = true;
      this.isFalse = false;
      this.isArray = [1, 2, 3]
      expect(object).to.equal(myObj);
      expect(options).to.equal(optsOnMixinInheriting);
    }
    CustomMixin.onMixinInheriting = function(subtype, options){
      expect(options).to.not.equal(myOptions);
      expect(options).to.deep.equal(myOptions);
      optsOnMixinInheriting = options;
    }
    mymixin(CustomMixin, myObj, myOptions);
    expect(myObj.__CustomMixin).to.be.instanceof(CustomMixin)
    expect(myObj.__CustomMixin.isTrue).to.be.true;
    expect(myObj.__CustomMixin.isFalse).to.be.false;
    expect(myObj.__CustomMixin.isArray).to.deep.equal([1, 2, 3]);
  });
  describe("Instance based mixin inheritance", function(){
    it("Works as expected", function(){
      let arrPromise = [];
      return Promise.coroutine(function* (){
        function CustomMixin(object, options){
          this.isTrue = true;
          this.isFalse = false;
          this.isArray = [1, 2, 3];
          expect(options).to.deep.equal({});
          arrPromise.push(Promise.resolve(object.opts));
        }
        CustomMixin.onMixinInheriting = function(subtype, options){ }

        function CustomObject(opts){ 
          this.opts = opts || {};
          mymixin(CustomMixin, this);
        }
        
        let myObj = new CustomObject();
        expect(myObj.__CustomMixin).to.be.instanceof(CustomMixin);
        let myOptions = yield arrPromise.slice(-1).pop();
        expect(myOptions).to.deep.equal({});

        let myObj2 = new CustomObject({a: 1});
        expect(myObj2.__CustomMixin).to.be.instanceof(CustomMixin);
        let myOptions2 = yield arrPromise.slice(-1).pop();
        expect(myOptions2).to.deep.equal({a: 1});
      })();
    });
  });
});