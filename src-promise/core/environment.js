var path = require('path');
var fs = require('fs');
var {EventEmitter} = require('events').EventEmitter;
var utils = require('./utils');
var {readJSONSync} = utils;
var {Config} = require('./config');
var {ContentPlugin, ContentTree, StaticFile} = require("./content");
var {TemplatePlugin, loadTemplates} = require("./templates");
var {logger} = require('./logger');
var {render} = require('./renderer');
var {runGenerator} = require('./generator');
var server = require('./server');

var Promise = require('bluebird');

var hasProp = {}.hasOwnProperty;
var slice = [].slice;
var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

class Environment extends EventEmitter{
  /* Create a new Environment, *config* is a Config instance, *workDir* is the
      working directory and *logger* is a log instance implementing methods for
      error, warn, verbose and silly loglevels.
    */
  constructor(config, workDir, logger){
    super();
    this.config = config;
    this.workDir = workDir;
    this.logger = logger;
    this.loadedModules = [];
    this.workDir = path.resolve(this.workDir);
    this.setConfig(config);
    this.reset();
  }
  reset(){
    /* Reset environment and clear any loaded modules from require.cache */
    var id;
    this.views = {
      none: function() {
        var args, callback, i;
        args = 2 <= arguments.length ? slice.call(arguments, 0, i = arguments.length - 1) : (i = 0, []), callback = arguments[i++];
        return callback();
      }
    };
    this.generators = [];
    this.plugins = {
      StaticFile: StaticFile
    };
    this.templatePlugins = [];
    this.contentPlugins = [];
    this.helpers = {};
    while (id = this.loadedModules.pop()) {
      this.logger.verbose("unloading: " + id);
      delete require.cache[id];
    }
    return this.setupLocals();
  }
  setConfig(config){
    this.config = config;
    this.contentsPath = this.resolvePath(this.config.contents);
    return this.templatesPath = this.resolvePath(this.config.templates);
  }
  setupLocals(){
    /* Resolve locals and loads any required modules. */
    var alias, filename, id, ref2;
    this.locals = {};
    if (typeof this.config.locals === 'string') {
      filename = this.resolvePath(this.config.locals);
      this.logger.verbose("loading locals from: " + filename);
      this.locals = readJSONSync(filename);
    } else {
      this.locals = this.config.locals;
    }
    ref2 = this.config.require;
    for (alias in ref2) {
      id = ref2[alias];
      logger.verbose("loading module '" + id + "' available in locals as '" + alias + "'");
      if (this.locals[alias] != null) {
        logger.warn("module '" + id + "' overwrites previous local with the same key ('" + alias + "')");
      }
      this.locals[alias] = this.loadModule(id);
    }
  }
  resolvePath(pathname){
    /* Resolve *pathname* in working directory, returns an absolute path. */
    return path.resolve(this.workDir, pathname || '');
  }
  resolveContentsPath(pathname){
    return path.resolve(this.contentsPath, pathname || '');
  }
  resolveModule(module){
    /* Resolve *module* to an absolute path, mimicing the node.js module loading system. */
    var error, nodeDir;
    switch (module[0]) {
      case '.':
        return require.resolve(this.resolvePath(module));
      case '/':
        return require.resolve(module);
      default:
        nodeDir = this.resolvePath('node_modules');
        try {
          return require.resolve(path.join(nodeDir, module));
        } catch (error1) {
          error = error1;
          return require.resolve(module);
        }
    }
  }
  relativePath(pathname){
    return path.relative(this.workDir, pathname);
  }
  relativeContentsPath(pathname){
    return path.relative(this.contentsPath, pathname);
  }
  registerContentPlugin(group, pattern, plugin){
    this.logger.verbose("registering content plugin " + plugin.name + " that handles: " + pattern);
    this.plugins[plugin.name] = plugin;
    return this.contentPlugins.push({
      group: group,
      pattern: pattern,
      "class": plugin
    });
  }
  registerTemplatePlugin(pattern, plugin){
    this.logger.verbose("registering template plugin " + plugin.name + " that handles: " + pattern);
    this.plugins[plugin.name] = plugin;
    return this.templatePlugins.push({
      pattern: pattern,
      "class": plugin
    });
  }
  registerGenerator(group, generator){
    return this.generators.push({
      group: group,
      fn: generator
    });
  }
  registerView(group, generator){
    return this.views[name] = view;
  }
  getContentGroups(){
    var generator, groups, i, j, len, len1, plugin, ref2, ref3, ref4, ref5;
    groups = [];
    ref2 = this.contentPlugins;
    for (i = 0, len = ref2.length; i < len; i++) {
      plugin = ref2[i];
      if (ref3 = plugin.group, indexOf.call(groups, ref3) < 0) {
        groups.push(plugin.group);
      }
    }
    ref4 = this.generators;
    for (j = 0, len1 = ref4.length; j < len1; j++) {
      generator = ref4[j];
      if (ref5 = generator.group, indexOf.call(groups, ref5) < 0) {
        groups.push(generator.group);
      }
    }
    return groups;
  }
  loadModule(module, unloadOnReset){
    var id, rv;
    if (unloadOnReset == null) {
      unloadOnReset = false;
    }

    /* Requires and returns *module*, resolved from the current working directory. */
    if (module.slice(-7) === '.coffee') {
      require('coffee-script/register');
    }
    this.logger.silly("loading module: " + module);
    id = this.resolveModule(module);
    this.logger.silly("resolved: " + id);
    rv = require(id);
    if (unloadOnReset) {
      this.loadedModules.push(id);
    }
    return rv;
  }
  loadPluginModule(module, callback){
    /* Load a plugin *module*.*/
    var id = 'unknown';
    var self = this;
    var done = function(error) {
      self.logger.verbose("plugin loaded!");
      if (error != null) {
        error.message = "Error loading plugin '" + id + "': " + error.message;
      }
      return callback(error);
    };
    try {
      if (typeof module === 'string') {
        id = module;
        module = this.loadModule(module);
      }
      module.call(null, this, done);
    } catch (error) {
      if (error != null) {
        error.message = "Error loading plugin '" + id + "': " + error.message;
      }
      done(error);
    }
  }
  loadPluginModulePromise(module){
    return Promise.promisify(this.loadPluginModule, {context: this})(module);
  }
  loadViewModule(id){
    /* Load a view *module* and add it to the environment. */
    this.logger.verbose("loading view: " + id);
    try {
      var module = this.loadModule(id, true);
      this.registerView(path.basename(id), module);
    } catch (error) {
      error.message = "Error loading view '" + id + "': " + error.message;
      throw error;
    }
  }
  loadPlugins(){
    var self = this;
    return Promise.coroutine(function*(){
      try{
        var defaultPlugins = self.config.defaultPlugins || self.constructor.defaultPlugins;
        for (var i = 0; i < defaultPlugins.length; i++) {
          let plugin = defaultPlugins[i];
          self.logger.verbose("loading default plugin: " + plugin);
          var id = require.resolve("./../plugins/" + plugin);
          module = require(id);
          self.loadedModules.push(id);
          yield self.loadPluginModulePromise(module);
        }
        for (var i = 0; i < self.config.plugins.length; i++) {
          let plugin = self.config.plugins[i];
          self.logger.verbose("loading plugin: " + plugin);
          yield self.loadPluginModulePromise(plugin);
        }
      } catch(err){
        self.logger.error(err);
        throw err;
      }
    })()
  }
  loadViews(){
    var self = this;
    if (this.config.views == null) {
      return;
    }
    var filenames = fs.readdirSync(this.resolvePath(this.config.views));
    var modules = filenames.map(function(filename){
      return self.config.views + "/" + filename;
    });
    modules.forEach(this.loadViewModule.bind(this))
  }
  getContents(){
    var self = this;
    return Promise.coroutine(function*(){
      var contents = yield ContentTree.fromDirectory(self, self.contentsPath);
      var generated = self.generators.map(function(generator){
        return runGenerator(self, contents, generator);
      });
      if (generated.length === 0) {
        return contents;
      }
      tree = new ContentTree('', self.getContentGroups());
      for (i = 0, len = generated.length; i < len; i++) {
        gentree = generated[i];
        ContentTree.merge(tree, gentree);
      }
      ContentTree.merge(tree, contents)
      return tree;
    })();
  }
  getTemplates(){
    return loadTemplates(this);
  }
  getLocals(){
    return this.locals;
  }
  load(){
    var self = this;
    return Promise.coroutine(function*(){
      yield self.loadPlugins();
      self.loadViews();
      var contents = yield self.getContents();
      var templates = yield  self.getTemplates();
      var locals = self.getLocals();
      return {contents, templates, locals};
    })();
    
  }
  preview(){
    var self = this;
    this.mode = 'preview';
    return this.server.run(this)
    .then(function(server){
      self.restart = server.restart;
      return server;
    });
  }
  build(outputDir){
    var self = this;
    return Promise.coroutine(function*(){
      self.mode = 'build';
      outputDir = outputDir || self.resolvePath(self.config.output);
      var result = yield self.load();
      var {contents, locals, templates} = result;
      return yield render(self, outputDir, contents, templates, locals);  
    })();
  }

  static create(config, workDir, log){
    log = log || logger;
    if (typeof config === 'string') {
      if (workDir == null) {
        workDir = path.dirname(config);
      }
      config = Config.fromFile(config);
    } else {
      if (workDir == null) {
        workDir = process.cwd();
      }
      if (!(config instanceof Config)) {
        config = new Config(config);
      }
    }
    return new Environment(config, workDir, log);
  }
}
Environment.defaultPlugins = ['page', 'jade', 'markdown'];
Environment.prototype.utils = utils;
Environment.prototype.ContentTree = ContentTree;
Environment.prototype.ContentPlugin = ContentPlugin;
Environment.prototype.TemplatePlugin = TemplatePlugin;
Environment.prototype.server = server;

module.exports = {
  Environment
};
