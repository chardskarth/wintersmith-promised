"use strict";

let micromatch = require('micromatch');
let assert = require('assert');
let Promise = require('bluebird');
let _ = require('lodash');

module.exports = function(logger, util, mixin, directoryable, contentsPath
    ,ContentTree, StaticFile, ContentPlugin){
  let {buildLookupMap, contentTreeMerge} = util;

  let contentPlugins = [];
  let generators = [];
  let contents;
  let micromatchOptions = {
    dot: false
  };

  let mainRetVal = {}
  function registerFunctionToMainRetVal(obj){
    _.forOwn(obj, function(value, key){
      mainRetVal[key] = value.bind(mainRetVal)
    });
  }

  function loadContentPlugin(filepath){
    return Promise.coroutine(function* (){
      logger.silly("loading " + filepath.relative);
      let plugin = contentPlugins.find(function({pattern}){
        return micromatch.isMatch(filepath.relative, pattern, micromatchOptions)
      })
      plugin = plugin || {
        "class": StaticFile,
        group: 'files'
      }
      let instance = plugin["class"].fromFile(filepath);
      instance = yield Promise.cast(instance);
      assert(instance instanceof plugin["class"]);
      instance.setBase({}, plugin, filepath.full);
      return instance;  
    })();
  }

  function initializeFromDirectory(){
    let {
      filterIgnoreContents: filter
      , directoryStat, getDirectoryName
    } = util;
    let readDirectoryResolve = function(directory){
      return util.readDirectoryAndResolve(directory, contentsPath);
    }
    let loadDirectory = function(resolvedFilename, parentDirectory, directoryName){
      return Promise.coroutine(function* (){
        let result = yield mainRetVal.fromDirectory(resolvedFilename.full);
        result.setParent(parentDirectory);
        parentDirectory.addDirectory(directoryName, result);
      })();
    }
    let loadFile = function(resolvedFilename, parentDirectory, directoryName){
      return Promise.coroutine(function* (){
        let result = yield loadContentPlugin(resolvedFilename);
        result.setParent(parentDirectory);
        parentDirectory.addFile(directoryName, result);
      })();
    }
    let loadParentDirectory = function(directory){
      return new ContentTree(directory)
    }

    mixin(directoryable, mainRetVal, {readDirectoryResolve
        , filter, directoryStat, getDirectoryName, loadFile, loadDirectory
        , loadParentDirectory });
  }

  function contentTreeFromDirectory(directory){
    return mainRetVal.fromDirectory(directory);
  }

  function runGenerator(contents, generator){
    var resolve = function(root, items){
      var results = [];
      for (let key in items) {
        let item = items[key];
        if (item instanceof ContentPlugin) {
          item.parent = root;
          item.setBase({}, generator, 'generator');
          root.addFile(key, item);
          root[key] = item;
          //this is goonna failll kasi tinanggal ko yung groupNames
          // results.push(root._[generator.group].push(item));
        } else if (item instanceof Object) {
          tree = new ContentTree(key);
          tree.setParent(root);
          root.addDirectory(key, tree);
          results.push(resolve(root[key], item));
        } else {
          throw new Error("Invalid item for '" + key + "' encountered when resolving generator output");
        }
      }
      return results;
    }
    var generated = generator.fn(contents);
    var tree = new ContentTree('');
    resolve(tree, generated);
    return tree;
  }

  function runGenerators(contents){
    return generators.map(generator => runGenerator(contents, generator));
  }

  function contentsLookupMap(){
    return Promise.coroutine(function* (){
      if(!contents){
        contents = yield contentTreeFromDirectory(contentsPath)
      }
      let map = buildLookupMap(contents);
      return {contents, map}
    })();
  }

  function generatorsLookupMap(contents){
    return Promise.coroutine(function* (){
      let generated = runGenerators(contents);
      let map = {};
      let tree = new ContentTree('');
      if(generated.length){
        for(let i = 0; i < generated.length; i++){
          let gentree = generated[i];
          contentTreeMerge(tree, gentree);
        }
        contentTreeMerge(tree, contents);
      } 
      map = buildLookupMap(generated);
      contentTreeMerge(tree, contents);
      return {contents: tree, map}
    })();
  }

  function registerContentPlugin(group, pattern, plugin){
    logger.verbose("registering content plugin " + plugin.name + " that handles: " + pattern);
    return contentPlugins.push({
      group,
      pattern,
      "class": plugin
    });
  }

  function registerGenerator(group, generator){
    return generators.push({
      group: group,
      fn: generator
    });
  }

  initializeFromDirectory();
  registerFunctionToMainRetVal({
    contentsLookupMap
    , generatorsLookupMap
    , registerContentPlugin
    , registerGenerator
    , contentTreeFromDirectory
    , loadContentPlugin
  });
  
  return mainRetVal;
}