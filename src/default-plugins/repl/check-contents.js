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

function insertNewFiles(added, contents, loadContentPlugin){
  return Promise.coroutine(function* (){
    if(added.length){
      logger.info("new files detected. not yet supported, you'll have to restart for now... sad.");
    }
  })();
}

function diff(prev, curr){
  let edited = [];
  let added = [];
  deepDiff(prev, curr, function(d){
    let objectPath = d.path.slice(0, d.path.length - 1);
    let stat = objectPath.length ? _.get(curr, objectPath) : curr;
    stat.path = d.path.filter(x => x !== 'children' && x !== 'md5');
    if(stat.type === "file"){
      if(d.kind === "E"){
        edited.push(stat);
      } else if (d.kind === "A"){
        added.push(stat);
      }
    }
    applyChange(prev, curr, d);
  });
  return {edited, added};
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
      let {edited, added} = diff(previousTree, currentTree);
      yield rebuildLookupMap(edited, contents, loadContentPlugin);
      yield insertNewFiles(added, contents, loadContentPlugin);
    })();
  }
}