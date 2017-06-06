var chokidar = require('chokidar');
var chalk = require('chalk');
var http = require('http');
var mime = require('mime');
var url = require('url');
var Promise = require('bluebird');
var minimatch = require('minimatch');
var enableDestroy = require('server-destroy');
var {Stream} = require('stream');
var {Config} = require('./config');
var {pump} = require('./utils');
var {renderView} = require('./renderer');
var {runGenerator} = require('./generator');
var {ContentTree, ContentPlugin, loadContent} = require('./content');

pump = Promise.promisify(pump);

var colorCode = function(code) {
  switch (Math.floor(code / 100)) {
    case 2:
      return chalk.green(code);
    case 4:
      return chalk.yellow(code);
    case 5:
      return chalk.red(code);
    default:
      return code.toString();
  }
};

var sleep = function(callback) {
  return setTimeout(callback, 50);
};

var normalizeUrl = function(anUrl) {
  if (anUrl[anUrl.length - 1] === '/') {
    anUrl += 'index.html';
  }
  if (anUrl.match(/^([^.]*[^\/])$/)) {
    anUrl += '/index.html';
  }
  anUrl = decodeURI(anUrl);
  return anUrl;
};

var urlEqual = function(urlA, urlB) {
  return normalizeUrl(urlA) === normalizeUrl(urlB);
};

var keyForValue = function(object, value) {
  var key;
  for (key in object) {
    if (object[key] === value) {
      return key;
    }
  }
  return null;
};

var replaceInArray = function(array, oldItem, newItem) {
  var idx;
  idx = array.indexOf(oldItem);
  if (idx === -1) {
    return false;
  }
  array[idx] = newItem;
  return true;
};

var buildLookupMap = function(contents) {
  var i, item, len, map, ref1;
  map = {};
  ref1 = ContentTree.flatten(contents);
  for (i = 0, len = ref1.length; i < len; i++) {
    item = ref1[i];
    map[normalizeUrl(item.url)] = item;
  }
  return map;
};

  setup = function(env) {

    /* Create a preview request handler. */
    var block, changeHandler, contentHandler, contentWatcher, contents, isReady, loadContents, loadLocals, loadTemplates, loadViews, locals, logop, lookup, requestHandler, templateWatcher, templates, viewsWatcher;
    contents = null;
    templates = null;
    locals = null;
    lookup = {};
    block = {
      contentsLoad: false,
      templatesLoad: false,
      viewsLoad: false,
      localsLoad: false
    };
    isReady = function() {

      /* Returns true if we have no running tasks */
      var k, v;
      for (k in block) {
        v = block[k];
        if (v === true) {
          return false;
        }
      }
      return true;
    };
    logop = function(error) {
      if (error != null) {
        return env.logger.error(error.message, error);
      }
    };
    changeHandler = function(error, path) {
      /* Emits a change event if called without error */
      if (error == null) {
        env.emit('change', path);
      }
      return logop(error);
    };
    loadContents = function() {
      return Promise.coroutine(function*(){
        block.contentsLoad = true;
        lookup = {};
        contents = null;
        var result = yield ContentTree.fromDirectory(env, env.contentsPath);
        contents = result;
        lookup = buildLookupMap(result);
        block.contentsLoad = false;  
      })();
    };
    loadTemplates = function() {
      return Promise.coroutine(function*(){
        block.templatesLoad = true;
        templates = null;
        var result = yield env.getTemplates();
        templates = result;
        block.templatesLoad = false;
      })();
    };
    loadViews = function() {
      block.viewsLoad = true;
      env.loadViews();
      block.viewsLoad = false;
    };
    loadLocals = function() {
      block.localsLoad = true;
      locals = null;
      var result = env.getLocals();
      locals = result;
      block.localsLoad = false;
    };

    if(!env.config.noWatchContents){
      contentWatcher = chokidar.watch(env.contentsPath, {
        ignored: function(path) {
          var i, len, pattern, ref1;
          ref1 = env.config.ignore;
          for (i = 0, len = ref1.length; i < len; i++) {
            pattern = ref1[i];
            if (minimatch(env.relativeContentsPath(path), pattern)) {
              return true;
            }
          }
          return false;
        },
        ignoreInitial: true
      });
      contentWatcher.on('all', function(type, filename) {
        if (block.contentsLoad) {
          return;
        }
        return loadContents(function(error) {
          var content, contentFilename, i, len, ref1;
          contentFilename = null;
          if ((error == null) && (filename != null)) {
            ref1 = ContentTree.flatten(contents);
            for (i = 0, len = ref1.length; i < len; i++) {
              content = ref1[i];
              if (content.__filename === filename) {
                contentFilename = content.filename;
                break;
              }
            }
          }
          return changeHandler(error, contentFilename);
        });
      });
    } else { // if !env.config.noWatchContents 
      contentWatcher = undefined;
    } 

    if(!env.config.noWatchTemplates){
      templateWatcher = chokidar.watch(env.templatesPath, {
        ignoreInitial: true
      });
      templateWatcher.on('all', function(event, path) {
        if (!block.templatesLoad) {
          return loadTemplates(changeHandler);
        }
      });
    } else { // if !env.config.noWatchTemplates
      templateWatcher = undefined;
    }
    if (env.config.views != null && !env.config.noWatchViews) {
      viewsWatcher = chokidar.watch(env.resolvePath(env.config.views), {
        ignoreInitial: true
      });
      viewsWatcher.on('all', function(event, path) {
        if (!block.viewsLoad) {
          delete require.cache[path];
          loadViews();
          changeHandler(null, path);
        }
      });
    } else { 
      viewsWatcher = undefined;
    }
    contentHandler = function(request, response) {
      return Promise.coroutine(function*(){
        var retVal; //{error, responseCode, pluginName}
        var uri = normalizeUrl(url.parse(request.url).pathname);
        env.logger.verbose("contentHandler - " + uri);
        var generated = env.generators.map(function(generator){
          return runGenerator(env, contents, generator)
        });
        let tree, generatorLookup;
        if(generated.length > 0){
          tree = new ContentTree('', env.getContentGroups());
          for (var i = 0; i < generated.length; i++) {
            var gentree = generated[i];
            ContentTree.merge(tree, gentree);
          }
          generatorLookup = buildLookupMap(generated);
          ContentTree.merge(tree, contents);
        } else {
          tree = contents;
          generatorLookup = {};
        }
        var content = generatorLookup[uri] || lookup[uri];
        if(content){
          let pluginName = content.constructor.name;
          let error, responseCode, result;
          try{
            let result = renderView(env, content, locals, tree, templates);
            result = yield Promise.cast(result);
            if(result){
              let mimeType = mime.lookup(content.filename, mime.lookup(uri));
              let charset = mime.charsets.lookup(mimeType);
              if (charset) {
                contentType = mimeType + "; charset=" + charset;
              } else {
                contentType = mimeType;
              }
              if (result instanceof Stream) {
                response.writeHead(200, {
                  'Content-Type': contentType
                });
                responseCode = 200;
                yield pump(result, response);
                // , function(error) {
                //   responseCode = 200;
                //   defer.resolve({error, responseCode, pluginName});
                // });
              } else if (result instanceof Buffer) {
                response.writeHead(200, {
                  'Content-Type': contentType
                });
                response.write(result);
                response.end();
                responseCode = 200;
                // defer.resolve({error, responseCode, pluginName});
              } else {
                error = new Error("View for content '" + content.filename + "' returned invalid response. Expected Buffer or Stream.");
                responseCode = 500;
                // defer.resolve({error, responseCode, pluginName});
              }
            } else {
              // response.writeHead(404, {
              //   'Content-Type': 'text/plain'
              // });
              // response.end('404 Not Found\n');
              responseCode = 404;
              // defer.resolve({error, responseCode, pluginName});
            }
          } catch(error1){
            error = error1;
            responseCode = 404;
          }
          retVal = {error, responseCode, pluginName};
          return retVal;
        } else {
          retVal = {};
          return retVal;
          // defer.resolve({});
        }
      })();
    };
    requestHandler = function(request, response) {
      var start, uri;
      start = Date.now();
      uri = url.parse(request.url).pathname;
      return Promise.coroutine(function*(){
        if (!block.contentsLoad && (contents == null)) {
          yield loadContents();
        }
        if (!block.templatesLoad && (templates == null)) {
          yield loadTemplates();
        }
        while(!isReady){
          yield Promise.promisify(sleep)();
        }
        let {error, responseCode, pluginName} 
          = yield contentHandler(request, response);
        if ((error != null) || (responseCode == null)) {
          responseCode = error != null ? 500 : 404;
          response.writeHead(responseCode, {
            'Content-Type': 'text/plain'
          });
          response.end(error != null ? error.message : '404 Not Found\n');
        }
        var delta = Date.now() - start;
        var logstr = (colorCode(responseCode)) + " " + (chalk.bold(uri));
        if (pluginName != null) {
          logstr += " " + (chalk.grey(pluginName));
        }
        logstr += chalk.grey(" " + delta + "ms");
        env.logger.info(logstr);
        if (error) {
          return env.logger.error(error.message, error);
        }
      })();
    };
    return Promise.coroutine(function*(){
      yield loadContents();
      yield loadTemplates();
      loadViews();
      loadLocals();
      requestHandler.destroy = function() {
        contentWatcher && contentWatcher.close();
        templateWatcher && templateWatcher.close();
        viewsWatcher && viewsWatcher.close();
        // return viewsWatcher != null ? viewsWatcher.close() : void 0;
      };
      return requestHandler;
    })();
  };

  run = function(env) {
    var configWatcher, handler, restart, server, start, stop;
    server = null;
    handler = null;
    if (env.config._restartOnConfChange && (env.config.__filename != null)) {
      env.logger.verbose("watching config file " + env.config.__filename + " for changes");
      configWatcher = chokidar.watch(env.config.__filename);
      configWatcher.on('change', function() {
        var cliopts, config, error, key, value;
        try {
          config = Config.fromFileSync(env.config.__filename);
        } catch (error1) {
          error = error1;
          env.logger.error("Error reloading config: " + error.message, error);
        }
        if (config != null) {
          if (cliopts = env.config._cliopts) {
            config._cliopts = {};
            for (key in cliopts) {
              value = cliopts[key];
              config[key] = config._cliopts[key] = value;
            }
          }
          env.setConfig(config);
          return restart()
          .then(() => {
            env.logger.verbose('config file change detected, server reloaded');
            return env.emit('change');
          })
        }
      });
    }
    restart = function() {
      env.logger.info('restarting server');
      stop();
      return start();
    };
    stop = function() {
      if (server != null) {
        server.destroy();
        handler.destroy();
        env.reset();
      }
    };
    start = function() {
      env.loadPlugins();
      return setup(env)
      .then(function(handler1){
        handler = handler1;
        server = http.createServer(handler);
        enableDestroy(server);
        server.on('error', function(error) {
          env.emit('serverError', error);
        });
        server.on('listening', function() {
          env.emit('serverListening');
        });
        var retVal = server.listen(env.config.port, env.config.hostname);
        retVal.restart = restart;
        return retVal;
      })
    };
    process.on('uncaughtException', function(error) {
      env.logger.error(error.message, error);
      return process.exit(1);
    });
    env.logger.verbose('starting preview server');
    return start()
    .then(function(server){
      var host = env.config.hostname || 'localhost';
      var serverUrl = "http://" + host + ":" + env.config.port + env.config.baseUrl;
      env.logger.info("server running on: " + (chalk.bold(serverUrl)));
      env.emit("runFinished", server);
      return server;
    });
  };

  module.exports = {
    run: run,
    setup: setup
  };


