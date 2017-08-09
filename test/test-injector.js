let chai = require("chai");
let expect = chai.expect;
let {shouldThrow, createTemplateRebuilder, createDeleteSync} = require('./util');
let assert = require('assert');
let path = require('path')
let {join} = path;

let Injector = require("./../src/injector");
let Promise = require('bluebird');

describe("Injector", function(){
  it('Should be instantiable', function(){
    new Injector();
  });
  it("Should have the expected own properties", function(){
    expect(Object.getOwnPropertyNames(Injector.prototype)).to.have.all.members([
      'constructor', '_getParamsArr', 'invoke', "setDependencies", "setDependency"
      , "getDependencies"
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
  describe("setDependency", function(){
    it("Should set new dependency", function(){
      let injector = new Injector();
      function number(numbers){
        return numbers * 2;
      }
      injector.setDependency('numbers', 4);
      let res = injector.invoke(number);
      expect(res).to.equal(8);
    });
    it("Should assert string as key", function(){
      let injector = new Injector();
      [false, true, {}, []]
        .forEach(key => {
          shouldThrow(function(){
            injector.setDependency(key, 'value');
          }, function(err){
            expect(err.message).to.equal('key must be a string')
          });
        });
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
    // it("Should get dependencies", function(){
    //   let string = "string";
    //   let array = ['a', 'b', 'c', 'd'];
    //   let injector = new Injector();
    //   function stringAndArray(string, array){
    //     return string + array.join('');
    //   }
    //   injector.setDependencies({string, array});
    //   let res = injector.invoke(stringAndArray);
    //   expect(res).to.equal('stringabcd');
    // });
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
});