"use strict";

let Promise = require('bluebird');
let Environment = require('./../src-environment/environment')
let path = require('path');

//some configs
Promise.config({
  longStackTrace: true
});

function getInvoker(cwdutil, target = {}){
  let Injector = cwdutil.requireCWD("./src/modules/injector/injector");
  let injectorInstance = new Injector(target);
  let retVal = function(toRequire, dependencyName){
    if(typeof toRequire === 'string'){
      toRequire = cwdutil.requireCWD(toRequire);
    }
    return injectorInstance.autoInvoke(toRequire, dependencyName)
      .catch(err => {
        console.log('yeah');
        console.log(err);
        process.exit(1);
      });
  };
  ['setDependencies', 'getDependencies', 'assertInvokeResolved'].forEach(x => {
    retVal[x] = injectorInstance[x].bind(injectorInstance);
  });
  retVal._dependencies = injectorInstance._dependencies;
  return retVal;
}

//Normalize configs. cliOpts takes precedence over config.json over default configs
function getConfig(invoke, workDir, configDefaults, configPath, cliOpts){
  let util = invoke.getDependencies('util');
  let configJson = util.tryLoadFile(configPath, 'config found: ', "no config found");
  let config = Object.assign({workDir}, configDefaults, configJson, cliOpts);
  let {contentsPath, templatesPath} = ensurePathsExist(util, workDir, config);
  invoke.setDependencies({config, workDir, contentsPath, templatesPath});
}

function ensurePathsExist(util, workDir, config){
  let contentsPath = util.pathResolve(workDir, config.contents);
  let templatesPath = util.pathResolve(workDir, config.templates);
  util.ensurePathsExist(['contents', contentsPath], ['templates', templatesPath]);
  return {contentsPath, templatesPath};
}

function createEnvInterface(util, injector){
  let [ContentPlugin, TemplatePlugin, ContentTree, ReplPlugin, contentsPath
          , templatesPath, logger, config, contentLoader, templateLoader, replLoader] 
      = injector.getDependencies('ContentPlugin', 'TemplatePlugin', 'ContentTree'
          , 'ReplPlugin', 'contentsPath', 'templatesPath', 'logger', 'config'
          , 'contentLoader', 'templateLoader', 'replLoader');

  let {contentTreeFlatten, relativeContentsPath} = util;

  let {registerContentPlugin, registerGenerator, contentTreeFromDirectory} 
      = contentLoader;

  let {registerTemplatePlugin} = templateLoader;

  let {registerReplPlugin} = replLoader;

  let helpers = {};

  return {
    ContentPlugin, TemplatePlugin, ContentTree, ReplPlugin, contentsPath
    , templatesPath, logger, config
    , contentTreeFlatten, relativeContentsPath
    , registerContentPlugin, registerGenerator, contentTreeFromDirectory
    , registerTemplatePlugin, registerReplPlugin
    , helpers
  };
}

function createCliInterface(invoke){
  let {preview, build} = invoke.getDependencies('siteoutput');
  let logger = invoke.getDependencies('logger');
  return {preview, build, logger};
}

//load client plugins and default wintersmith plugins
// client plugins are given 'env interface'
// default plugins are given access to every object, that's why we pass an injector
function loadPlugins(util, invoke){
  let pluginsEnvInterface = createEnvInterface(util, invoke);
  util.loadPlugins(pluginsEnvInterface); 
  util.loadWintersmithPlugins(invoke); 
}

let thisWintersmithDirectory = path.resolve(__dirname, "./../");
module.exports = function(workDir, configDefaults, configPath, cliOpts){
  let env = Environment.createInstance(thisWintersmithDirectory);
  let {cwdutil, logger} = env;
  let {requireCWD} = cwdutil;
  let invoke = getInvoker(cwdutil, {env, cwdutil, logger});
  invoke.setDependencies({invoke});
  
  invoke('./src/util', 'util');
  invoke("./src/util-contenthelpers");

  getConfig(invoke, workDir, configDefaults, configPath, cliOpts);

  invoke("./src/contents/contentplugin", "ContentPlugin");
  invoke("./src/templates/templateplugin", "TemplatePlugin");
  invoke("./src/repls/replplugin", "ReplPlugin");
  invoke("./src/contents/contenttree", "ContentTree");
  invoke("./src/contents/staticfileplugin", "StaticFile");

  let mixin = requireCWD("./src/mixins/mixin");
  let directoryable = requireCWD("./src/mixins/directoryable");
  invoke.setDependencies({mixin, directoryable});

  invoke("./src/contents/contentloader", "contentLoader");
  invoke("./src/templates/templateloader", "templateLoader");
  invoke("./src/repls/replloader", "replLoader");
  invoke("./src/resulthelper", "ResultHelperFactory");
  invoke("./src/siteoutput", "siteoutput");

  invoke(loadPlugins);
  invoke.assertInvokeResolved();
  return createCliInterface(invoke);
}