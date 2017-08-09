let chai = require("chai");
let expect = chai.expect;
let {shouldThrow, createTemplateRebuilder, createDeleteSync} = require('./util');
let path = require('path')
let {join} = path;
let assert = require('assert');
let Promise = require('bluebird');

let util = require("./../src/util");
let ContentTreeFunc = require("./../src/contents/contenttree");
let Environment = require(join(__dirname, "./../src-environment/environment"));
let env = Environment.createInstance();
let mixin = require("./../src/mixins/mixin");
let directoryable = require("./../src/mixins/directoryable");
let config = {};
util = util(env);
let Directoryable = require("./../src/mixins/directoryable");

describe("ContentTree", function(){
  it("ContentTree work fine", function(){
    env.set({contentsPath: ""});
    ContentTreeFunc({util, mixin, config, directoryable});
  });
  it("Instances of ContentTree are not shared", function(){
    let a = ContentTreeFunc({util, mixin, config, directoryable});
    let b = ContentTreeFunc({util, mixin, config, directoryable});
    expect(a).to.not.equal(b);
  });
  it('have expected properties', function(){
    let ContentTree = ContentTreeFunc({util, mixin, config, directoryable});
    expect(ContentTree.prototype).to.own.property('constructor');
  });
  it('have expected static properties', function(){
    let ContentTree = ContentTreeFunc({util, mixin, config, directoryable});
    [ 'length', 'name', 'prototype' , 'defineProperties' ]
      .forEach(x => expect(ContentTree).to.have.own.property(x))
  });
  it('have expected instance properties', function(){
    let {defineProperty} = util;
    let ContentTree = ContentTreeFunc({defineProperty});
    let instance = new ContentTree();
    [ 'directoryName', '_directories', '_files', 'parent', 'setParent',
        'addDirectory', 'addFile' ]
      .forEach(x => expect(instance).to.have.own.property(x))
  });
  // it("fromDirectory works as expected", function(){
  //   return Promise.coroutine(function* (){
  //     let contentsPath =
  //     env.delete('contentsPath');
      
  //     env.set({contentsPath: join(__dirname, "..")});
      
  //     console.log(util.contentsPath);
  //     let ContentTree = ContentTreeFunc({util, mixin, config, directoryable});
  //     let res = yield ContentTree.fromDirectory(join(__dirname, ".."))
  //     console.log(res);
  //   })();
  // });
});