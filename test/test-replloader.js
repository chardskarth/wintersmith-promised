let chai = require("chai");
let expect = chai.expect;
let {shouldThrow} = require('./util');
let path = require('path');
let {join} = path;
let assert = require('assert');
let Promise = require('bluebird');

let Injector = require(join(__dirname, "./../src/modules/injector/injector"));
let util = require("./../src/util");
let ReplLoaderFunc = require("./../src/repls/replloader");
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
let ReplPlugin = injector.invoke(ReplPluginFunc);
injector.setDependencies({ReplPlugin});

function createReplLoader(){
  return injector.invoke(ReplLoaderFunc);
}

describe("replLoader", function(){
  it("ReplLoader work fine", function(){
    createReplLoader();
  });
  it("registerReplPlugin requires a ReplPlugin instance", function(){
    shouldThrow(function(){
      let {registerReplPlugin} = createReplLoader();
      registerReplPlugin({})
    }, function(err){
      expect(err.message).to.equal('registerReplPlugin expects a Class that inherits ReplPlugin');
    });
  });
  it("registerReplPlugin throws on same name", function(){
    class ReplInstance extends ReplPlugin{
      SanaMatry(){}
    }
    let instance = new ReplInstance();
    let {registerReplPlugin} = createReplLoader();
    registerReplPlugin(ReplInstance);
    shouldThrow(function(){
      registerReplPlugin(ReplInstance);
    }, function(err){
      expect(err.message).to.equal('registerReplPlugin already registered ReplInstance');
    })
  });
  it("registerReplPlugin throws on multiple existing functions", function(){
    class ReplInstance extends ReplPlugin{
      SanaMatry(){}
    }
    class ReplInstance2 extends ReplPlugin{
      SanaMatry(){}
    }
    let instance = new ReplInstance();
    let {registerReplPlugin} = createReplLoader();
    registerReplPlugin(ReplInstance);
    shouldThrow(function(){
      registerReplPlugin(ReplInstance2);
    }, function(err){
      expect(err.message).to.equal('registerReplPlugin already registered: SanaMatry');
    })
  });
  it("adds previously added functions to replContext", function(){
    let defer1 = Promise.defer();
    let defer2 = Promise.defer();
    let replContext = {defer1, defer2};
    let {registerReplPlugin, loadReplPlugins} = createReplLoader();
    class ReplInstance1 extends ReplPlugin{
      constructor(replContext){ super(); this.defer = defer1;}
      ResolveOne(){
        this.defer.resolve();
      }
    }
    class ReplInstance2 extends ReplPlugin{
      constructor(replContext){ super(); this.defer = defer2;}
      ResolveTwo(){
        this.defer.resolve();
      }
    }
    registerReplPlugin(ReplInstance1);
    registerReplPlugin(ReplInstance2);
    loadReplPlugins(replContext);
    replContext.ResolveOne();
    replContext.ResolveTwo();
    return Promise.all([defer1.promise, defer2.promise]);
  });
});
