let chai = require("chai");
let expect = chai.expect;
let {shouldThrow} = require('./util');
let path = require('path');
let {join} = path;
let assert = require('assert');
let Promise = require('bluebird');

let Injector = require(join(__dirname, "./../src/modules/injector/injector"));
let util = require("./../src/util");
let TemplatePluginFunc = require("./../src/templates/templateplugin");

let fakeLogger = {
  info: function(){}
  , verbose: function(){}
  , silly: function(){}
  , error: function(){}
}
let fakeConfig = {}
let injector = new Injector({logger: fakeLogger, config: fakeConfig});

util = injector.invoke(util);
injector.setDependencies({util});

function createTemplatePlugin(){
  return injector.invoke(TemplatePluginFunc);
}

describe("TemplatePlugin", function(){
  it("TemplatePlugin work fine", function(){
    createTemplatePlugin();
  });
  it("Instances of TemplatePlugin are not shared", function(){
    let a = createTemplatePlugin();
    let b = createTemplatePlugin();
    expect(a).to.not.equal(b);
  });
  it('have expected properties', function(){
    let TemplatePlugin = createTemplatePlugin();
    expect(Object.getOwnPropertyNames(TemplatePlugin.prototype)).to.have.all.members([
      'constructor', 'render'
    ]);
  });
  it("asserts proper filepath object", function(){
    let TemplatePlugin = createTemplatePlugin();
    shouldThrow(function(){
      new TemplatePlugin();
    }, function(err){
      expect(err.message).to.equal('filepath should be {relative<String>, full<String>');
    });
    shouldThrow(function(){
      new TemplatePlugin({relative:"asf"});
    }, function(err){
      expect(err.message).to.equal('filepath must have full<String>');
    });
    shouldThrow(function(){
      new TemplatePlugin({full:"asf"});
    }, function(err){
      expect(err.message).to.equal('filepath must have relative<String>');
    });
    new TemplatePlugin({relative: "a", full: "b"});
  });
  it('have expected instance properties', function(){
    let {defineProperty} = util;
    let TemplatePlugin = createTemplatePlugin();
    let instance = new TemplatePlugin({relative: "a", full: "b"});
    expect(Object.getOwnPropertyNames(instance)).to.have.all.members([
      'filepath'
    ]);
  });
});