let chai = require("chai");
let expect = chai.expect;
let {shouldThrow, shouldReject, createTemplateRebuilder, createDeleteSync} = require('./util');
let assert = require('assert');
let path = require('path')
let {join} = path;

let Injector = require(join(__dirname, "./../src/modules/injector/injector"));
let Promise = require('bluebird');

describe("Injector", function(){
  it('Should be instantiable', function(){
    new Injector();
  });
  it("Should have the expected own properties", function(){
    expect(Object.getOwnPropertyNames(Injector.prototype)).to.have.all.members([
      'constructor', '_getParamsArr', '_getParamsName', 'invoke', "setDependencies"
      , "getDependencies", 'autoInvoke', 'assertInvokeResolved', '_createError'
      , '_assertNonExisting'
    ]);
  });
  it("Should have the injected parameters", function(){
    let string = "string";
    let numbers = 12345;
    let array = ['a', 'b', 'c'];
    let injector = new Injector({string, numbers, array});
    function stringAndArray(string, array){
      return string + array.join('');
    }
    function number(numbers){
      return numbers * 2;
    }
    let res = injector.invoke(stringAndArray);
    expect(res).to.equal('stringabc');
    res = injector.invoke(number);
    expect(res).to.equal(24690);
  });
  it("should throw on undefined param", function(){
    let injector = new Injector();
    function stringAndArray(string, array){
      return string + array.join('');
    }
    shouldThrow(function(){
      injector.invoke(stringAndArray);
    }, function(err){
      expect(err.message).to.equal('unknown parameter: string')
    });
  });
  describe("setDependencies", function(){
    it("Should set new dependencies", function(){
      let injector = new Injector();
      let string = "string";
      let array = ['a', 'b', 'c', 'd'];
      function stringAndArray(string, array){
        return string + array.join('');
      }
      injector.setDependencies({string, array});
      let res = injector.invoke(stringAndArray);
      expect(res).to.equal('stringabcd');
    });
    it("Should assert string as object", function(){
      let injector = new Injector();
      [false, true, 'string', [], null]
        .forEach(keyValue => {
          shouldThrow(function(){
            injector.setDependencies(keyValue);
          }, function(err){
            expect(err.message).to.equal('keyValue must be an object')
          });
        });
    });
  });
  describe("getDependencies", function(){
    it("should return object itself on single argument", function(){
      let string = "string";
      let injector = new Injector({string});
      let string2 = injector.getDependencies('string');
      expect(string2).to.equal(string);
    });
    it("should return array on multiple argument", function(){
      let string = "string";
      let array = ['a', 'b', 'c', 'd'];
      let injector = new Injector({string, array});
      let [string2, array2] = injector.getDependencies('string', 'array');
      expect(string2).to.equal(string);
      expect(array2).to.deep.equal(array);
    });
    it("Should assert string or array of strings only", function(){
      let injector = new Injector();
      [false, true, 'string', [1, 2], ['string', 2], null]
        .forEach(keyValue => {
          shouldThrow(function(){
            injector.setDependencies(keyValue);
          }, function(err){
            expect(err.message).to.equal('keyValue must be an object')
          });
        });
    });
  });
  describe("Auto Invoker", function(){
    it("Should emit dependencyAdded", function(){
      return Promise.coroutine(function* (){
        let defer = Promise.defer();
        let injector = new Injector();
        injector.on("dependencyAdded", function(){
          defer.resolve();
        });
        injector.setDependencies({ok: 1});
        yield defer.promise;
      })();
    });
    it("creates depedency after resolving", function(){
      let result = {a: 3, b: 2, c:'1'};
      let injector = new Injector();
      function noNeed(result){
        return result;
      }
      injector.autoInvoke(noNeed, "noNeed");
      injector.setDependencies({result})
      let noNeed2 = injector.getDependencies("noNeed");
      expect(noNeed2).to.deep.equal(result);
    });
    it("resolves immediately if dependency is met", function(){
      let result = {a: 3, b: 2, c:'1'};
      let injector = new Injector({result});
      function noNeed(result){
        return result;
      }
      injector.autoInvoke(noNeed, "noNeed");
      let noNeed2 = injector.getDependencies("noNeed");
      expect(noNeed2).to.deep.equal(result);
    });
    it("throws when dependencyName is existing", function(){
      let result = {a: 3, b: 2, c:'1'};
      let injector = new Injector({result});
      function noNeed(){}
      shouldThrow(function(){
        injector.autoInvoke(noNeed, "result");
      }, function(err){
        expect(err.message).to.equal("result already existing");
      });
    });
    it("throws when dependencyName is used in another autoInvoke", function(){
      let injector = new Injector();
      function noNeed(){}
      function noNeed2(){}
      injector.autoInvoke(noNeed, "result");
      shouldThrow(function(){
        injector.autoInvoke(noNeed2, "result");
      }, function(err){
        expect(err.message).to.equal("result already existing in autoInvoke");
      });
    });
    it("throws on circular dependency", function(){
      let injector = new Injector();
      function ClassA(objectC, objectB){ isAExecuted = true; return "a";}
      function ClassB(objectA){ isBExecuted = true; return "b";}
      injector.autoInvoke(ClassA, "objectA");
      shouldThrow(function(){
        injector.autoInvoke(ClassB, "objectB");
      }, function(err){
        expect(err.message).to.equal(
          "circular dependency detected. objectB > objectA > objectB");
      });
    });
    it("throws on self dependency", function(){
      let injector = new Injector();
      function ClassA(objectA){ console.log('asdf');}
      shouldThrow(function(){
        injector.autoInvoke(ClassA, "objectA");
      }, function(err){
        expect(err.message).to.equal("self dependency detected: objectA");
      });
    });
    it("invokes function after dependency is resolved", function(){
      let [isAExecuted, isBExecuted] = [false, false];
      let dependencyAddedCount = 0;
      let injector = new Injector();
      let objectA, objectB, objectC;
      function ClassA(objectC){ isAExecuted = true; return "a";}
      function ClassB(objectA){ isBExecuted = true; return "b";}
      function ClassC(){ return "c" }
      injector.on("dependencyAdded", function(){
        dependencyAddedCount++;
        try{
          objectA = injector.getDependencies('objectA');
        } catch(err){}
        try{
          objectB = injector.getDependencies('objectB');
        } catch(err){}
        try{
          objectC = injector.getDependencies('objectC');
        } catch(err){}
      });
      injector.autoInvoke(ClassC, "objectC");
      expect(dependencyAddedCount).to.equal(1);
      expect(objectA).to.be.undefined
      expect(objectB).to.be.undefined
      expect(objectC).to.equal('c');
      injector.autoInvoke(ClassB, "objectB");
      expect(dependencyAddedCount).to.equal(1);
      expect(objectA).to.be.undefined
      expect(objectB).to.be.undefined
      expect(objectC).to.equal('c');
      injector.autoInvoke(ClassA, "objectA");
      expect(dependencyAddedCount).to.equal(3);
      expect(objectA).to.equal('a');
      expect(objectB).to.equal('b');
      expect(objectC).to.equal('c');
    });
    it("nesting autoInvoke treats error separately", function(){
      this.timeout(100);
      return Promise.coroutine(function* (){
        let injector1 = new Injector();
        expect(injector1.instanceId).to.exist;
        let injector2, injector3;
        function ClassA(){
          injector2 = new Injector();
          function ClassB(objectA){}
          injector2.invoke(ClassB);
        }
        yield shouldReject(function(){
          return injector1.autoInvoke(ClassA);
        }, function(err){
          expect(err.injectorInstanceId).to.equal(injector2.instanceId);
        });
      })();
    });
    describe("assertInvokeResolved", function(){
      it("throws on pending invokes", function(){
        let injector = new Injector();
        function ClassA(objectB, objectC){ console.log('asdf');}
        function ClassD(objectA, objectE){}
        function ClassE(){}
        // function ClassB(){}
        injector.autoInvoke(ClassA, "objectA");
        injector.autoInvoke(ClassD, "objectD");
        injector.autoInvoke(ClassE, "objectE");
        // injector.autoInvoke(ClassB, "objectB");
        shouldThrow(function(){
          injector.assertInvokeResolved();
        }, function(err){
          expect(err.message).to.include("ClassA not yet resolved. missing dependencies: objectB, objectC");
          expect(err.message).to.include("ClassD not yet resolved. missing dependencies: objectA");
        });
      });
    });
  });
});