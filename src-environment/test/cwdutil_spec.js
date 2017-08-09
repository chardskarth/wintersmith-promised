var chai = require("chai")
var should = chai.should()
var assert = chai.assert
var expect = chai.expect
var Promise = require("bluebird")
var _ = require("lodash")
var {shouldThrow} = require('./util')
var path = require('path')
var {join, resolve} = path;
var {mkdirSync, readFileSync} = require('fs');
var copydir = require('copy-dir');
var del = require('node-delete');
var mvPromise = Promise.promisify(require('mv'));
var mv = function(from, to, opts){
  opts = opts || {};
  from = join(TEST_UTIL_FOLDER_DEST, from);
  to = join(TEST_UTIL_FOLDER_DEST, to);
  return mvPromise(from, to, opts);
}

const TEST_UTIL_FOLDER_TEMPLATE = join(__dirname, "./test-util-folder-template");
const TEST_UTIL_FOLDER_DEST = join(__dirname, "./test-util");

const TEST_UTIL_FOLDER_TEMPLATE_2 = join(__dirname, "./test-util-folder-template-2");
const TEST_UTIL_FOLDER_DEST_2 = join(__dirname, "./test-util-2");

var cwdutil = require(join(__dirname, "../cwdutil"));

describe('cwdutil', function(){
  function rebuildTemplate(){
    try{
      mkdirSync(TEST_UTIL_FOLDER_DEST);
    } catch(err){}
    copydir.sync(TEST_UTIL_FOLDER_TEMPLATE, TEST_UTIL_FOLDER_DEST);
  }
  function rebuildTemplate2(){
    try{
      mkdirSync(TEST_UTIL_FOLDER_DEST_2);
    } catch(err){}
    copydir.sync(TEST_UTIL_FOLDER_TEMPLATE_2, TEST_UTIL_FOLDER_DEST_2);
  }
  before(rebuildTemplate)
  before(rebuildTemplate2)
  after(function(){
    del.sync(TEST_UTIL_FOLDER_DEST);
    del.sync(TEST_UTIL_FOLDER_DEST_2);
  })
  describe("requireCWD", function(){
    it("Should not accept absolute path", function(){
      shouldThrow(function(){
        let absolutePath = resolve(__dirname, ".")
        let {requireCWD} = cwdutil(TEST_UTIL_FOLDER_DEST)
        let overridenPath = requireCWD(absolutePath);
      }, function(err){
        expect(err.message).to.have.string("does not accept absolutePaths")
      });
    })
    it("Should look for relative path of environment's cwd", function(){
      rebuildTemplate();
      let {requireCWD} = cwdutil(TEST_UTIL_FOLDER_DEST)
      let overridenPath = requireCWD("path");
      expect(overridenPath).to.not.equal(path);
      expect(overridenPath).to.equal("override");
    })
    it("if not found, should look for node_modules of environment's cwd", function(){
      rebuildTemplate();
      // nodejs caches the previously loaded path module, so we must delete it
      let pathPath = join(TEST_UTIL_FOLDER_DEST, "path.js");
      delete require.cache[pathPath]
      del.sync(pathPath);

      let {requireCWD} = cwdutil(TEST_UTIL_FOLDER_DEST)
      let overridenPath = requireCWD("path");
      expect(overridenPath).to.not.equal(path);
      expect(overridenPath).to.equal("path");
    })
    it("if not found, should then delegate to node's default require", function(){
      rebuildTemplate();
      // nodejs caches the previously loaded path module, so we must delete it
      let pathPath = join(TEST_UTIL_FOLDER_DEST, "path.js");
      delete require.cache[pathPath]
      del.sync(pathPath);
      pathPath = join(TEST_UTIL_FOLDER_DEST, "node_modules", "path");
      delete require.cache[join(TEST_UTIL_FOLDER_DEST, "node_modules", "path", "index.js")]
      del.sync(pathPath);
      
      let {requireCWD} = cwdutil(TEST_UTIL_FOLDER_DEST)
      let overridenPath = requireCWD("path");
      expect(overridenPath).to.equal(path);
    })
  });
  describe("readFileCWD", function(){
    it("Should not accept absolute path", function(){
      shouldThrow(function(){
        let absolutePath = resolve(__dirname, ".")
        let {readFileCWD} = cwdutil(TEST_UTIL_FOLDER_DEST)
        let overridenPath = readFileCWD(absolutePath);
      }, function(err){
        expect(err.message).to.have.string("does not accept absolutePaths")
      });
    })
    it("Should look for relative path of environment's cwd", function(){
      rebuildTemplate();
      rebuildTemplate2();
      let {readFileCWD} = cwdutil(TEST_UTIL_FOLDER_DEST)
      let overridenPath = readFileCWD("path.js");
      expect(overridenPath).to.not.equal(path);
      expect(overridenPath).to.equal(`module.exports = "override";`);

      readFileCWD = cwdutil(TEST_UTIL_FOLDER_DEST_2).readFileCWD;
      overridenPath = readFileCWD("path.js");
      expect(overridenPath).to.not.equal(path);
      expect(overridenPath).to.equal(`module.exports = "override-2";`);
    })
  })
  describe("walkDirSync", function(){
    it("Should not accept absolute path", function(){
      shouldThrow(function(){
        let absolutePath = resolve(__dirname, ".")
        let {walkDirSync} = cwdutil(TEST_UTIL_FOLDER_DEST)
        let overridenPath = walkDirSync(absolutePath);
      }, function(err){
        expect(err.message).to.have.string("does not accept absolutePaths")
      });
    });
    it("Should look for relative path of environment's cwd", function(){
      rebuildTemplate();
      rebuildTemplate2();
      let {walkDirSync} = cwdutil(TEST_UTIL_FOLDER_DEST)
      let fileList = walkDirSync("node_modules");
      expect(fileList).to.have.length(2)

      walkDirSync = cwdutil(TEST_UTIL_FOLDER_DEST_2).walkDirSync;
      fileList = walkDirSync("node_modules");
      expect(fileList).to.have.length(3)
    });
  })
  describe("isFileExist", function(){
    it("Should not accept absolute path", function(){
      shouldThrow(function(){
        let absolutePath = resolve(__dirname, ".")
        let {isFileExist} = cwdutil(TEST_UTIL_FOLDER_DEST)
        let overridenPath = isFileExist(absolutePath);
      }, function(err){
        expect(err.message).to.have.string("does not accept absolutePaths")
      });
    });
    it("Should look for relative path of environment's cwd", function(){
      rebuildTemplate();
      rebuildTemplate2();
      let {isFileExist} = cwdutil(TEST_UTIL_FOLDER_DEST)
      let fileExist = isFileExist("node_modules/extra/index.js");
      expect(fileExist).to.be.false;

      isFileExist = cwdutil(TEST_UTIL_FOLDER_DEST_2).isFileExist;
      fileExist = isFileExist("node_modules/extra/index.js");
      expect(fileExist).to.be.true;
    });
  })
});
