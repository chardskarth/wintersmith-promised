let chai = require("chai");
let expect = chai.expect;
let {shouldThrow, createTemplateRebuilder, createDeleteSync} = require('./util');
let path = require('path')
let {join} = path;
let assert = require('assert');
let Promise = require('bluebird');

let utils = require("./../src/util");

const TEMPLATE_WITHCONFIG = join(__dirname, "./template-withconfig");
const DEST_WITHCONFIG = join(__dirname, "./dest-withconfig");

const TEMPLATE_NOCONFIG = join(__dirname, "./template-withoutconfig");
const DEST_NOCONFIG = join(__dirname, "./dest-withoutconfig");

let Injector = require(join(__dirname, "./../src/modules/injector/injector"));
let fakeLogger = {
  info: function(){}
  , verbose: function(){}
  , silly: function(){}
  , error: function(){}
}
let injector = new Injector({logger: fakeLogger});

function createUtils(){
  return injector.invoke(utils);
}

describe("utils", function(){
  // let withConfigTemplate = createTemplateRebuilder(TEMPLATE_WITHCONFIG, DEST_WITHCONFIG);
  // let noConfigTemplate = createTemplateRebuilder(
  //     TEMPLATE_NOCONFIG, DEST_NOCONFIG);
  // let deleteConfigTemplate = createDeleteSync(DEST_WITHCONFIG);
  // let deleteNoConfigTemplate = createDeleteSync(DEST_NOCONFIG);
  // before(withConfigTemplate);
  // before(noConfigTemplate);
  // after(deleteConfigTemplate);
  // after(deleteNoConfigTemplate);
  it("utils work fine", function(){
    createUtils();
  });
  it("Instances of utils are not shared", function(){
    let a = createUtils();
    let b = createUtils();
    expect(a).to.not.equal(b);
  });
  describe("tryLoadFile", function(){
    it("Should work if file is not existing", function(){
      let {tryLoadFile} = createUtils();
      let emptyObj = tryLoadFile("asdf asdf");
      expect(emptyObj).to.deep.equal({});
    });
    it("Should load config if existing", function(){
      let {tryLoadFile} = createUtils();
      let emptyObj = tryLoadFile(join(TEMPLATE_WITHCONFIG, "config.json"));
      expect(emptyObj).to.deep.equal({"IsTrue": true, "IsString": "string"});
    });
  });
  describe("ensurePathsExist", function(){
    it("Throw if not existing", function(){
      let {ensurePathsExist} = createUtils();
      shouldThrow(function(){
        ensurePathsExist(['blah', 'non existing']);
      }, function(err){
        expect(err.message).to.equal("blah path invalid (non existing)")
      })
    });
    it("Work fine if it exists", function(){
      let configPath = join(TEMPLATE_WITHCONFIG, "config.json");
      let {ensurePathsExist} = createUtils();
      ensurePathsExist();
      ensurePathsExist(['blah', configPath]);
    });
  });
});