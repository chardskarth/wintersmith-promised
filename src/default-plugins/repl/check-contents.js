let fsJetpack = require("fs-jetpack");
let Promise = require('bluebird');
let {observableDiff: deepDiff, applyChange} = require('deep-diff');
let _ = require('lodash');

function mapChildrenToObject(tree){
  delete tree.size;
  if(!tree.children) {
    return;
  }
  let newChildren = tree.children.reduce((prev, curr) => {
    prev[curr.name] = curr;
    curr.children = mapChildrenToObject(curr);
    return prev;
  }, {});
  return tree.children = newChildren;
}

function rebuildLookupMap(arrEdited, contents, loadContentPlugin){
  return Promise.coroutine(function* (){
    for(let ii = 0; ii < arrEdited.length; ii++){
      let changedFileStat = arrEdited[ii];
      let oldContentObject = _.get(contents, changedFileStat.path);
      let newContentObject = yield loadContentPlugin(oldContentObject.filepath);
      _.set(contents, changedFileStat.path, newContentObject);
    }
  })();
}

function insertNewFiles(added, contents, loadContentPlugin, logger){
  return Promise.coroutine(function* (){
    if(added.length){
      logger.info("new files detected. not yet supported, you'll have to restart for now... sad.");
    }
  })();
}
function deleteInexistentFiles(deleted, contents, loadContentPlugin, logger){
  return Promise.coroutine(function* (){
    if(deleted.length){
      logger.info("old files deleted. not yet supported, you'll have to restart for now... sad.");
    }
  })();
}

function diff(prev, curr){
  let edited = [];
  let added = [];
  let deleted = [];
  function filterPath(path){
    return path.filter(x => x !== 'children' && x !== 'md5');
  }
  function isLastPathMD5(arrPath){
    return arrPath.slice(-1).pop() === "md5";
  }
  function removeLast(arrPath){
    return arrPath.slice(0, arrPath.length - 1);
  }
  function getStat(object, objectPath){
    let retVal = objectPath.length ? _.get(object, objectPath) : object;
    retVal.path = filterPath(objectPath);
    return retVal;
  }
  deepDiff(prev, curr, function(d){
    while(true){
      if(d.kind === "E" && isLastPathMD5(d.path)){
        let objectPath = removeLast(d.path);
        let stat = getStat(curr, objectPath);
        if(stat.type !== 'file'){
          break;
        }
        edited.push(stat);
      } else if(d.kind === "N") {
        let stat = getStat(curr, d.path);
        added.push(stat);
      } else if(d.kind === "D"){
        let stat = getStat(prev, d.path);
        deleted.push(stat);
      }
      break;
    }
    applyChange(prev, curr, d);
  });
  return {edited, added, deleted};
}

let preparedCheckContents = false;
module.exports = function(replContext, contentsPath, logger, contentsLookupMap
    , loadContentPlugin, logger){
  let currentInspectOptions = {
    checksum: 'md5'
    , relativePath: true
  }
  let whenContentsLookupMap;
  let whenCurrentTree;

  replContext.prepareCheckContents = function(){
    if(preparedCheckContents){
      console.log('prepareCheckContents already called');
      return;
    }
    whenContentsLookupMap = contentsLookupMap();
    whenCurrentTree = fsJetpack.inspectTreeAsync(contentsPath, currentInspectOptions)
    .then(x => {
      mapChildrenToObject(x);
      replContext.previousTree = x;
      return x;
    });
    preparedCheckContents = true;
  }

  replContext.checkContents = function(){
    if(!preparedCheckContents){
      console.log('call prepareCheckContents first');
      return;
    }
    console.log('checking contentsPath for changes');
    return Promise.coroutine(function* (){
      let previousTree = yield whenCurrentTree;
      let {contents} = yield whenContentsLookupMap;
      let currentTree = fsJetpack.inspectTree(contentsPath, currentInspectOptions);
      mapChildrenToObject(currentTree);
      let {edited, added, deleted} = diff(previousTree, currentTree);
      yield rebuildLookupMap(edited, contents, loadContentPlugin, logger);
      yield insertNewFiles(added, contents, loadContentPlugin, logger);
      yield deleteInexistentFiles(deleted, contents, loadContentPlugin, logger);
    })();
  }
}