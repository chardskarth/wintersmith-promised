"use strict";

let _ = require("lodash");
let Promise = require('bluebird');
let micromatch = require('micromatch');
let chalk = require('chalk');

let micromatchOptions = {
  dot: false
};

module.exports = function(util, cwdutil, ContentTree, ContentPlugin, contentsPath
    , templatesPath, workDir, config){

  function registerToUtil(obj){
    _.forOwn(obj, function(value, key){
      util[key] = value.bind(util);
    });
  }

  let pathHelpers = {
    relativeContentsPath(toRelative){
      return this.pathRelative(contentsPath, toRelative);
    }
    , relativeTemplatesPath(toRelative){
      return this.pathRelative(templatesPath, toRelative);
    }
    , resolveWorkDirPath(toResolve){
      return this.pathResolve(workDir, toResolve);
    }
  }
  
  let contentHelpers = {
    contentTreeFlatten(tree){
      let retVal = [];
      for(let key in tree){
        let value = tree[key];
        if(value instanceof ContentTree){
          retVal = retVal.concat(this.contentTreeFlatten(value));
        } else {
          retVal.push(value);
        }
      }
      return retVal;
    }
    , contentTreeMerge(root, tree){
      _.forOwn(tree, (item, key) => {
        if (item instanceof ContentPlugin) {
          item.parent = root;
          root.addFile(key, item);
        } else if (item instanceof ContentTree) {
          let toMerge = root[key];
          if (toMerge == null) {
            toMerge = new ContentTree(key);
            toMerge.parent = root;
            root.addDirectory(key, toMerge); //adds root[key]
          }
          this.contentTreeMerge(toMerge, item);
        } else {
          throw new Error("Invalid item in tree for '" + key + "'");
        }
      });
    }
    , contentTreeInspect(tree, depth){
      /* Return a pretty formatted string representing the content *tree*. */
      if (typeof tree === 'number') {
        return '[Function: ContentTree]';
      }
      depth = depth || 0;
      //just create a padding by depth
      let pad = (new Array(depth)).fill().reduce((x) => x += '  ', '');
      let rv = [];
      let keys = Object.keys(tree).sort((a, b) => {
        let ad = tree[a] instanceof ContentTree;
        let bd = tree[b] instanceof ContentTree;
        if (ad !== bd) {
          return bd - ad;
        }
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      });
      for (let i = 0; i < keys.length; i++) {
        let toPush;
        let k = keys[i];
        let l = tree[k];
        if(l instanceof ContentTree){
          toPush = (chalk.bold(k)) + "/\n";
          toPush += this.contentTreeInspect(l, depth + 1);
        } else {
          let cfn = (s) => s;
          if (l.pluginColor !== 'none') {
            if (!(cfn = chalk[l.pluginColor])) {
              throw new Error("Plugin " + k + " specifies invalid pluginColor: " + l.pluginColor);
            }
          }
          toPush = (cfn(k)) + " (" + (chalk.grey(l.pluginInfo)) + ")";
        }
        rv.push(pad + toPush);
      }
      return rv.join('\n');
    }
    , filterIgnoreContents(filenames){
      let arrIgnore = config.ignore || [];
      let retVal = filenames;
      if (arrIgnore.length > 0) {
        retVal = filenames.filter(function(filename){
          let include = !arrIgnore.some((patternIgnore) => {
            return micromatch.isMatch(filename.relative, patternIgnore, micromatchOptions);
          });
          return include;
        });
      }
      return retVal;
    }
  }

  let loaderHelpers = {
    resolveModule(module){
      switch(module[0]){
        case '.':
          return require.resolve(this.resolveWorkDirPath(module));
        case '/':
          return require.resolve(module);
        default:
          let nodeDir = this.resolveWorkDirPath('node_modules');
          try {
            return require.resolve(util.pathJoin(nodeDir, module));
          } catch (error) {
            return require.resolve(module);
          }
      }
    }
    , loadModule(module){
      let id = this.resolveModule(module);
      return require(id);
    }
    , loadPluginModule(module, arrParams){
      let defer = Promise.defer();
      let done = function(err){
        if(err){
          defer.reject(err);
        }
        defer.resolve();
      }
      try{
        if(typeof module === "string"){
          module = this.loadModule(module);
        }
        module.apply(null, arrParams.concat([done]));
      } catch(error){
        error.message = "Error loading plugin '" + module.name + "': " + error.message;
        done(error);
      }
      return defer.promise;
    }
    , loadPlugins(...args){
      let self = this;
      return Promise.coroutine(function* (){
        let plugins = config.plugins;
        for(let i = 0; i < plugins.length; i++){
          let plugin = plugins[i];
          yield self.loadPluginModule(plugin, args);
        }
      })();
    }
    , loadWintersmithPlugins(invoke){
      return Promise.coroutine(function* (){
        let resolvedCWDPlugins = config.wintersmithPlugins
          .map(x => util.pathJoin(config.wintersmithPluginsPath, x))
          .map(x => cwdutil.resolveCWD(x));
        for(let i = 0; i < resolvedCWDPlugins.length; i++){
          let plugin = require(resolvedCWDPlugins[i]);
          invoke(plugin);
        }
      })();
    }
  }

  registerToUtil(pathHelpers);
  registerToUtil(contentHelpers);
  registerToUtil(loaderHelpers);
}