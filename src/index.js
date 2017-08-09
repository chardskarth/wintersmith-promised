let Promise = require('bluebird');
let Environment = require('./../src-environment/environment')
let path = require('path');

//some configs
Promise.config({
  longStackTrace: true
});

function initInjector(util, target = {}){
  let Injector = util.requireCWD("./src/injector");
  let injectorInstance = new Injector(target);
  return injectorInstance;
}

//Normalize configs. cliOpts takes precedence over config.json over default configs
function getConfig(util, workDir, configDefaults, configPath, cliOpts){
  let configJson = util.tryLoadFile(configPath, 'config found: ', "no config found");
  return Object.assign({workDir}, configDefaults, configJson, cliOpts);
}

function ensurePathsExist(util, workDir, config){
  let contentsPath = util.pathResolve(workDir, config.contents);
  let templatesPath = util.pathResolve(workDir, config.templates);
  util.ensurePathsExist(['contents', contentsPath], ['templates', templatesPath]);
  return {contentsPath, templatesPath};
}

function createPluginsEnv(util, injector){
  let [ContentPlugin, TemplatePlugin, ContentTree, contentsPath, templatesPath
          , logger, config, contentLoader, templateLoader] 
      = injector.getDependencies('ContentPlugin', 'TemplatePlugin', 'ContentTree'
          , 'contentsPath', 'templatesPath', 'logger', 'config'
          , 'contentLoader', 'templateLoader');

  let {contentTreeFlatten, relativeContentsPath} = util;

  let {registerContentPlugin, registerGenerator, contentTreeFromDirectory} 
      = contentLoader;

  let {registerTemplatePlugin} = templateLoader;

  let helpers = {};

  return {
    ContentPlugin, TemplatePlugin, ContentTree, contentsPath, templatesPath
    , logger, config
    , contentTreeFlatten, relativeContentsPath
    , registerContentPlugin, registerGenerator, contentTreeFromDirectory
    , registerTemplatePlugin
    , helpers
  };
}

let thisWintersmithDirectory = path.resolve(__dirname, "./../");
module.exports = function(workDir, configDefaults, configPath, cliOpts){
  let env = Environment.createInstance(thisWintersmithDirectory);
  let {cwdutil, logger} = env;
  let {requireCWD} = cwdutil;
  let injector = initInjector(cwdutil, {env, logger});
  let util = injector.invoke(requireCWD('./src/util'));

  let config = getConfig(util, workDir, configDefaults, configPath, cliOpts);
  let {contentsPath, templatesPath} = ensurePathsExist(util, workDir, config);
  injector.setDependencies({util, config, workDir, contentsPath, templatesPath});

  let ContentPlugin = injector.invoke(requireCWD("./src/contents/contentplugin"));
  let TemplatePlugin = injector.invoke(requireCWD("./src/templates/templateplugin"));
  injector.setDependencies({ContentPlugin, TemplatePlugin});

  let ContentTree = injector.invoke(requireCWD("./src/contents/contenttree"));
  injector.setDependencies({ContentTree});

  let StaticFile = injector.invoke(requireCWD("./src/contents/staticfileplugin"));
  injector.setDependencies({StaticFile});

  injector.invoke(requireCWD("./src/util-contenthelpers"));

  let mixin = requireCWD("./src/mixins/mixin");
  let directoryable = requireCWD("./src/mixins/directoryable");
  injector.setDependencies({mixin, directoryable});

  let contentLoader = injector.invoke(requireCWD("./src/contents/contentloader"));
  let templateLoader = injector.invoke(requireCWD("./src/templates/templateloader"));
  injector.setDependencies({contentLoader, templateLoader});
  
  let {loadPlugins, loadPredefinedPlugins} = util;
  
  //create an "env" interface for loadPlugins. We do not want to expose every object we have
  let pluginsEnvInterface = createPluginsEnv(util, injector);
  loadPlugins(pluginsEnvInterface);
  // loadPredefinedPlugins(pluginsEnvInterface);

  let ResultHelperFactory = requireCWD("./src/resulthelper.js")(env);
  injector.setDependencies({ResultHelperFactory});
  let {preview, build} = injector.invoke(requireCWD("./src/siteoutput"));

  //create an "env" interface for cli
  let cliEnvInterface = {
    preview, build, logger, cwdutil
  }
  return cliEnvInterface;
}