let assert = require('assert');
let Promise = require('bluebird');
let {relative} = require('path');

function _isFunction(toCheck){
  return toString.call(toCheck) === "[object Function]";
}

function assertOptions(options){
  let {readDirectoryResolve, filter, directoryStat, getDirectoryName
    , loadParentDirectory, loadDirectory, loadFile } = options;

  if(!filter){
    options.filter = function(x){return x};
  }

  ["filter", "directoryStat", "readDirectoryResolve", "getDirectoryName"
      , "loadDirectory", "loadFile", "loadParentDirectory"]
    .forEach(x => {
      assert(_isFunction(options[x]), `${x} must be a function`);
    });
  return options;
}

class Directoryable{
  constructor(baseObject, options){ }

  static onMixinInheriting(subtype, options){
    let {readDirectoryResolve, filter, directoryStat, getDirectoryName, loadFile
        , loadDirectory, loadParentDirectory } = assertOptions(options);
    assertOptions(options);
    subtype.fromDirectory = Promise.coroutine(function* (directory){
      let parentDirectory = loadParentDirectory(directory);
      let arrResolvedFilenames = yield readDirectoryResolve(directory);
      arrResolvedFilenames = filter(arrResolvedFilenames);
      for(let resolvedFilename of arrResolvedFilenames){
        let isDirectory = yield directoryStat(resolvedFilename);
        let directoryName = getDirectoryName(resolvedFilename);
        if(isDirectory){
          yield loadDirectory(resolvedFilename, parentDirectory, directoryName
              , subtype.fromDirectory);
        } else /*if(isFile)*/{
          yield loadFile(resolvedFilename, parentDirectory, directoryName);
        }
      }
      return parentDirectory;
    }).bind(subtype);
  }
}

module.exports = Directoryable;