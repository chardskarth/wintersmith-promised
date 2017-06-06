var fs = require('fs');
var path = require('path');
var url = require('url');
var chalk = require('chalk');
var minimatch = require('minimatch');
var minimatchOptions = {
  dot: false
};
var {setImmediate} = require('./utils');
var Promise = require("bluebird");

var hasProp = {}.hasOwnProperty;
var slice = [].slice;

class ContentPlugin{
  static property(name, getter){
    /* Define read-only property with *name*. */
    var get;
    if (typeof getter === 'string') {
      get = function() {
        return this[getter].call(this);
      };
    } else {
      get = function() {
        return getter.call(this);
      };
    }
    return Object.defineProperty(this.prototype, name, {
      get: get,
      enumerable: true
    });
  }

  getView() {
    throw new Error('Not implemented.');
  }
  getFilename() {
    throw new Error('Not implemented.');
  }
  getUrl(base) {
    /* Return url for this content relative to *base*. */
    var filename;
    filename = this.getFilename();
    if (base == null) {
      base = this.__env.config.baseUrl;
    }
    if (!base.match(/\/$/)) {
      base += '/';
    }
    if (process.platform === 'win32') {
      filename = filename.replace(/\\/g, '/');
    }
    return url.resolve(base, filename);
  }
  getPluginColor() {
    return 'cyan';
  }
  getPluginInfo() {
    return "url: " + this.url;
  }

  static initClass(){
    ContentPlugin.property('view', 'getView');
    ContentPlugin.property('filename', 'getFilename');
    ContentPlugin.property('url', 'getUrl');
    ContentPlugin.property('pluginColor', 'getPluginColor');
    ContentPlugin.property('pluginInfo', 'getPluginInfo');
  }
  static fromFile(filepath) {
    throw new Error('Not implemented.');
  }
}
ContentPlugin.initClass();

class StaticFile extends ContentPlugin{
  constructor(filepath){
    super();
    this.filepath = filepath;
  }
  getView(){
    return function(...args) {
      return fs.createReadStream(this.filepath.full);
    };
  }
  getFilename(){
    return this.filepath.relative;
  }
  getPluginColor() {
    return 'none';
  };
  static fromFile (filepath) {
    return new StaticFile(filepath);
  };
}

var loadContent = function(env, filepath, callback) {
  return Promise.coroutine(function*(){
    /* Helper that loads content plugin found in *filepath*. */
    env.logger.silly("loading " + filepath.relative);
    var plugin = {
      "class": StaticFile,
      group: 'files'
    };
    for (var i = env.contentPlugins.length - 1; i >= 0; i--) {
      if (minimatch(filepath.relative, env.contentPlugins[i].pattern, minimatchOptions)) {
        plugin = env.contentPlugins[i];
        break;
      }
    }
    var instance = plugin["class"].fromFile(filepath);
    if(!instance) {
      console.log(filepath);
    }
    instance = yield Promise.cast(instance);
    if(!instance) {
      console.log(filepath);
    }
    instance && (instance.__env = env)
      && (instance.__plugin = plugin)
      && (instance.__filename = filepath.full);

    ;
    return instance;
  })()
  .catch((err) => {
    err.message = filepath.relative + ": " + err.message;
    throw err;
  });
};

  ContentTree = function(filename, groupNames) {
    var groups, j, len, name, parent;
    if (groupNames == null) {
      groupNames = [];
    }
    parent = null;
    groups = {
      directories: [],
      files: []
    };
    for (j = 0, len = groupNames.length; j < len; j++) {
      name = groupNames[j];
      groups[name] = [];
    }
    Object.defineProperty(this, '__groupNames', {
      get: function() {
        return groupNames;
      }
    });
    Object.defineProperty(this, '_', {
      get: function() {
        return groups;
      }
    });
    Object.defineProperty(this, 'filename', {
      get: function() {
        return filename;
      }
    });
    Object.defineProperty(this, 'index', {
      get: function() {
        var item, key, ref;
        ref = this;
        for (key in ref) {
          item = ref[key];
          if (key.slice(0, 6) === 'index.') {
            return item;
          }
        }
      }
    });
    return Object.defineProperty(this, 'parent', {
      get: function() {
        return parent;
      },
      set: function(val) {
        return parent = val;
      }
    });
  };

  ContentTree.fromDirectory = function(env, directory, callback) {

    /* Recursively scan *directory* and build a ContentTree with enviroment *env*.
        Calls *callback* with a nested ContentTree or an error if something went wrong.
     */
    var createInstance, createInstances, filterIgnored, readDirectory, reldir, resolveFilenames, tree;
    reldir = env.relativeContentsPath(directory);
    tree = new ContentTree(reldir, env.getContentGroups());
    env.logger.silly("creating content tree from " + directory);
    readDirectory = function() {
      return fs.readdirSync(directory);
    };
    resolveFilenames = function(filenames) {
      filenames.sort();
      return filenames.map(function(filename){
        var relative = path.join(reldir, filename);
        return {
          full: path.join(env.contentsPath, relative),
          relative
        }
      });
    };
    filterIgnored = function(filenames) {
      var toIgnore = env.config.ignore || [];
      if (toIgnore.length > 0) {
        return filenames.filter(function(filename){
          var include = true;
          for (var j = 0; j < toIgnore.length; j++) {
            var pattern = toIgnore[j];
            if(minimatch(filename.relative, pattern, minimatchOptions)){
              env.logger.verbose("ignoring " + filename.relative + " (matches: " + pattern + ")");
              include = false;
              break;
            }
          }
          return include;
        });
      } else {
        return filenames;
      }
    };
    createInstance = function(filepath) {
      return Promise.coroutine(function*(){
        /* Create plugin or subtree instance for *filepath*. */
        var stats = fs.statSync(filepath.full);
        var basename = path.basename(filepath.relative);
        if(stats.isDirectory()) {
          let result = yield ContentTree.fromDirectory(env, filepath.full);
          result.parent = tree;
          tree[basename] = result;
          tree._.directories.push(result);
        } else if(stats.isFile()){
          let instance = yield loadContent(env, filepath);
          instance.parent = tree;
          tree[basename] = instance;
          tree._[instance.__plugin.group].push(instance);
        } else {
          throw new Error("Invalid file " + filepath.full + ".");
        }
      })();
    };
    createInstances = function(filenames, callback) {
      return Promise.all(filenames.map(createInstance))
      // return async.forEachLimit(filenames, env.config._fileLimit, createInstance, callback);
    };
    return createInstances(
        filterIgnored(
          resolveFilenames(
            readDirectory()
    )))
      .then(() => tree);
    // return async.waterfall([readDirectory, resolveFilenames, filterIgnored, createInstances], function(error) {
    //   return callback(error, tree);
    // });
  };

  ContentTree.inspect = function(tree, depth) {
    var cfn, i, j, k, keys, l, len, pad, ref, rv, s, v;
    depth = depth || 0;

    /* Return a pretty formatted string representing the content *tree*. */
    if (typeof tree === 'number') {
      return '[Function: ContentTree]';
    }
    rv = [];
    pad = '';
    for (i = j = 0, ref = depth; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      pad += '  ';
    }
    keys = Object.keys(tree).sort(function(a, b) {
      var ad, bd;
      ad = tree[a] instanceof ContentTree;
      bd = tree[b] instanceof ContentTree;
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
    for (l = 0, len = keys.length; l < len; l++) {
      k = keys[l];
      v = tree[k];
      if (v instanceof ContentTree) {
        s = (chalk.bold(k)) + "/\n";
        s += ContentTree.inspect(v, depth + 1);
      } else {
        cfn = function(s) {
          return s;
        };
        if (v.pluginColor !== 'none') {
          if (!(cfn = chalk[v.pluginColor])) {
            throw new Error("Plugin " + k + " specifies invalid pluginColor: " + v.pluginColor);
          }
        }
        s = (cfn(k)) + " (" + (chalk.grey(v.pluginInfo)) + ")";
      }
      rv.push(pad + s);
    }
    return rv.join('\n');
  };

  ContentTree.flatten = function(tree) {

    /* Return all the items in the *tree* as an array of content plugins. */
    var key, rv, value;
    rv = [];
    for (key in tree) {
      value = tree[key];
      if (value instanceof ContentTree) {
        rv = rv.concat(ContentTree.flatten(value));
      } else {
        rv.push(value);
      }
    }
    return rv;
  };

  ContentTree.merge = function(root, tree) {

    /* Merge *tree* into *root* tree. */
    var item, key;
    for (key in tree) {
      item = tree[key];
      if (item instanceof ContentPlugin) {
        root[key] = item;
        item.parent = root;
        root._[item.__plugin.group].push(item);
      } else if (item instanceof ContentTree) {
        if (root[key] == null) {
          root[key] = new ContentTree(key, item.__groupNames);
          root[key].parent = root;
          root[key].parent._.directories.push(root[key]);
        }
        if (root[key] instanceof ContentTree) {
          ContentTree.merge(root[key], item);
        }
      } else {
        throw new Error("Invalid item in tree for '" + key + "'");
      }
    }
  };


  /* Exports */

module.exports = {
  ContentTree,
  ContentPlugin,
  StaticFile,
  loadContent,
};

