let chai = require("chai");
let expect = chai.expect;
let {shouldThrow, createTemplateRebuilder, createDeleteSync} = require('./util');
let assert = require('assert');
let path = require('path')
let {join} = path;

let mymixin = require("./../src/mixins/mixin");
let directoryable = require("./../src/mixins/directoryable");
let Promise = require('bluebird');

// const TEMPLATE_WITHCONFIG = join(__dirname, "./template-withconfig");
// const DEST_WITHCONFIG = join(__dirname, "./dest-withconfig");

// const TEMPLATE_NOCONFIG = join(__dirname, "./template-withoutconfig");
// const DEST_NOCONFIG = join(__dirname, "./dest-withoutconfig");

// let withConfigTemplate = createTemplateRebuilder(TEMPLATE_WITHCONFIG, DEST_WITHCONFIG);
// // let noConfigTemplate = createTemplateRebuilder(
// //     TEMPLATE_NOCONFIG, DEST_NOCONFIG);
// let deleteConfigTemplate = createDeleteSync(DEST_WITHCONFIG);
// // let deleteNoConfigTemplate = createDeleteSync(DEST_NOCONFIG);
// before(withConfigTemplate);
// // before(noConfigTemplate);
// after(deleteConfigTemplate);
// // after(deleteNoConfigTemplate);

describe("directoryable", function(){
  it("Should require function options", function(){
    let opts = {};
    let index;
    let requiredFunctions = ["directoryStat", "readDirectoryResolve", "getDirectoryName"
        , "loadDirectory", "loadFile", "loadParentDirectory"];
    requiredFunctions.forEach((required, i) => {
      index = i;
      shouldThrow(function(){
        mymixin(directoryable, {}, opts);
      }, function(err){
        expect(err.message).to.include(requiredFunctions[i]);
        expect(err.message).to.include('must be a function');
        opts[requiredFunctions[i]] = function(){}
      });
    });
  });

  describe("sample of using directoryable to create something tree-like", function(){
    let readDirectoryAndResolve = function(directoryString){
      let retVal = [];
      let arrDirectoryString = Array.from(directoryString);

      let aCount = 0;
      let aPush = [];
      function pushFirstTo(toPushTo){
        toPushTo.push(arrDirectoryString.shift());
      }
      if(arrDirectoryString[0] === 'a'){
        arrDirectoryString.shift();
      }
      while(arrDirectoryString.length){
        if(arrDirectoryString[0] === 'b' && aCount == 0){
          pushFirstTo(retVal);
        } else if(arrDirectoryString[0] === 'b' && aCount > 0){
          pushFirstTo(aPush);
        } else if(arrDirectoryString[0] === 'a'){
          aCount++;
          pushFirstTo(aPush);
        } else if(arrDirectoryString[0] == 'c'){
          aCount--;
          if(aCount == 0){
            arrDirectoryString.shift();
            retVal.push(aPush.join(''));
            aPush = []
          } else {
            pushFirstTo(aPush);
          }
        } else {
          console.log(aPush);
          console.log(retVal);
          console.log(aCount);
          throw new Error("test string must be abc's only");
        }
      }
      return retVal;
    }
    let loadParentDirectory = function(directory){
      return {type: 'node', directory};
    }
    let loadDirectory = function(filename, parentObject, directory, fromDirectory){
      return fromDirectory(filename);
    }
    let loadFile = function(filename, parentObject, directory){
      return {type: 'file', directory};
    }
    let directoryStat = function(directory){
      return directory[0] === 'a';
    }
    let getDirectoryName = function(name){
      return name;
    }
    it("readDirectoryAndResolve works expectedly", function(){
      let res = readDirectoryAndResolve('babcbbabbcaabbcbbbc');
      expect(res).to.deep.equal(['b', 'ab', 'b', 'b', 'abb', 'aabbcbbb']);
      res = readDirectoryAndResolve('aabbcbbb');
      expect(res).to.deep.equal(['abb', 'b', 'b', 'b']);
    });
    it("Should work as expected", function(){
      //convert this to tree.
      //   a means folder
      //   b means file
      //   c means end of the folder
      let toConvert = 'babcbbabbcaabbcbbbc';
      
    });
  });
});
