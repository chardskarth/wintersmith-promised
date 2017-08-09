let chai = require("chai");
let expect = chai.expect;
let {shouldThrow} = require('./util');
let path = require('path');
let {join} = path;
let assert = require('assert');
let Promise = require('bluebird');

let Injector = require(join(__dirname, "./../src/injector"));
let util = require("./../src/util");
let ContentPluginFunc = require("./../src/contents/contentplugin");

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

function createContentPlugin(){
  return injector.invoke(ContentPluginFunc);
}

describe("ContentPlugin", function(){
  it("ContentPlugin work fine", function(){
    createContentPlugin();
  });
  it("Instances of ContentPlugin are not shared", function(){
    let a = createContentPlugin();
    let b = createContentPlugin();
    expect(a).to.not.equal(b);
  });
  it('have expected properties', function(){
    let ContentPlugin = createContentPlugin();
    let properties = Object.getOwnPropertyNames(ContentPlugin.prototype);
    expect(properties).to.deep.equal([ 'constructor', 'getView', 'getFilename',
        'getUrl', 'setBase', 'view', 'filename', 'url' ]);
  });
  it('have expected instance properties', function(){
    let {defineProperty} = util;
    let ContentPlugin = createContentPlugin();
    let instance = new ContentPlugin();
    [ 'parent', 'setParent' ]
      .forEach(x => expect(instance).to.have.own.property(x))
  });
});