"use strict";

let express = require('express');
let {Stream} = require('stream');
let Promise = require('bluebird');
let nodeRepl = require('repl');
let chalk = require('chalk');
let url = require('url');
let mime = require('mime');

module.exports = function(logger, util, config, contentLoader, templateLoader
    , ResultHelperFactory, replLoader){
  let {normalizeUrl, colorCode, pump} = util;
  let {contentsLookupMap, generatorsLookupMap} = contentLoader;
  let {getTemplates} = templateLoader;
  let {loadReplPlugins} = replLoader;

  let {ResultHelper: ResultHelperClass
    , createInstance: createResultHelper
    , addMethod: addResultHelperMethod} = ResultHelperFactory();

  function renderView(contentToRender, contents, templates){
    return Promise.coroutine(function* (){
      let {view} = contentToRender;
      try{
        let viewResult = view.call(contentToRender, contents, templates);
        return yield Promise.cast(viewResult);
      } catch(error){
        error.message = contentToRender.filename + ": " + error.message;
        throw error;
      }
    })();
  }

  addResultHelperMethod()
    .addKnownError(["content not found"], 404)
    .addKnownError(["content's getView should return a Buffer or Stream"], 501)
  ;

  function _getExpressHandler(){
    function contentHandler(req, res, next){
      let responseBody = {
        start: Date.now()
      };
      let retVal = createResultHelper(null, responseBody);
      return Promise.coroutine(function* (){
        let uri = normalizeUrl(url.parse(req.originalUrl).pathname);
        let generatorLookup;
        let {contents, map: lookup} = yield contentsLookupMap();
        ({contents, map: generatorLookup} = yield generatorsLookupMap(contents));
        let templates = yield getTemplates();
        let content = responseBody.content = generatorLookup[uri] || lookup[uri];
        if(content){
          let result = responseBody.result = yield renderView(content, contents
              , templates);
          if(!result && !(result instanceof Buffer) && !(result instanceof Stream)){
            throw new Error("content's getView should return a Buffer or Stream");
          }
        } else {
          throw new Error("content not found");
        }
      })()
      .catch((err) => {
        retVal.setError(err);
      })
      .then(() => {
        req.knownResult = retVal;
        next();
      });
    }
    function resultHandler(req, res, next){
      if(req.knownResult && req.knownResult instanceof ResultHelperClass){
        let {knownResult, originalUrl: uri} = req;
        let {content, result, start} = knownResult.getResponseBody();
        let {error} = knownResult;
        let statusCode = knownResult.getStatusCode();
        if(error){
          res.status(statusCode);
          logger.error(error.message, error);
          next();
          return;
        }

        let pluginName = !content ? "" : content.constructor.name;
        let mimeType = mime.lookup(content.filename, mime.lookup(uri));
        
        res.type(mimeType);
        res.status(statusCode);
        if(result instanceof Stream){
          pump(result, res);
        } else if(result instanceof Buffer){
          res.send(result);
        }

        let delta = Date.now() - start;
        let logstr = (colorCode(statusCode)) + " " + (chalk.bold(uri));
        if (pluginName !== "") {
          logstr += " " + (chalk.grey(pluginName));
        }
        logstr += chalk.grey(" " + delta + "ms");
        logger.info(logstr);
      } else {
        next();
      }
    }
    return [contentHandler, resultHandler];
  }

  let expressApp;

  function preview(){
    let defer = Promise.defer();
    if(!expressApp){
      expressApp = express();
      expressApp.use(_getExpressHandler());
      let {port, hostname: host} = config;
      host = host || 'localhost';
      expressApp.listen(port, function(err){
        if(err){
          defer.reject(err);
        }
        defer.resolve();
      });
    }
    repl();
    return defer.promise;
  }

  function build(){ }

  function repl(){ 
    let writer = function(output){
      return chalk.bold(output);
    }
    let replInstance = nodeRepl.start({writer});
    let replContext = replInstance.context;
    loadReplPlugins(replContext);
  }
  return {preview, build};
}