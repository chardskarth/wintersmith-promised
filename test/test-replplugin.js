let chai = require("chai");
let expect = chai.expect;
let {shouldThrow} = require('./util');
let path = require('path');
let {join} = path;
let assert = require('assert');
let Promise = require('bluebird');

let Injector = require(join(__dirname, "./../src/modules/injector/injector"));
let util = require("./../src/util");
let ReplPluginFunc = require("./../src/repls/replplugin");

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

function createReplPlugin(){
  return injector.invoke(ReplPluginFunc);
}

describe("ReplPlugin", function(){
  it("ReplPlugin work fine", function(){
    createReplPlugin();
  });
  it("Instances of ReplPlugin are not shared", function(){
    let a = createReplPlugin();
    let b = createReplPlugin();
    expect(a).to.not.equal(b);
  });
  it('have expected properties', function(){
    let ReplPlugin = createReplPlugin();
    expect(Object.getOwnPropertyNames(ReplPlugin.prototype)).to.have.all.members([
      'constructor'
    ]);
  });
  it('have expected instance properties', function(){
    let {defineProperty} = util;
    let ReplPlugin = createReplPlugin();
    let instance = new ReplPlugin({relative: "a", full: "b"});
    expect(Object.getOwnPropertyNames(instance)).to.have.all.members([]);
  });
});