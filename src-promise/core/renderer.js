var fs = require('fs');
var util = require('util');
var async = require('async');
var path = require('path');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var {Stream} = require('stream');
var {ContentTree} = require('./content');
var {pump, extend, setImmediate} = require('./utils');

pump = Promise.promisify(pump);

var renderView = function(env, content, locals, contents, templates) {
  var _locals = {
    env: env,
    contents: contents
  };
  Object.assign(_locals, locals);
  var {view} = content;
  if(typeof view === "string"){
    name = view;
    view = env.views[view];
    if (view == null) {
      throw new Error("content '" + content.filename + "' specifies unknown view '" + name + "'");
    }
  }
  try {
    return view.call(content, env, _locals, contents, templates);
  } catch(error){
    error.message = content.filename + ": " + error.message;
    throw error;
  }
}

var render = function(env, outputDir, contents, templates, locals) {
  return Promise.coroutine(function*(){
    env.logger.info("rendering tree:\n" + (ContentTree.inspect(contents, 1)) + "\n");
    env.logger.verbose("render output directory: " + outputDir);
    
    var renderPlugin = Promise.coroutine(function*(content){
      var result = renderView(env, content, locals, contents, templates);
      result = yield Promise.cast(result);
      if(result instanceof Stream || result instanceof Buffer){
        var destination = path.join(outputDir, content.filename);
        env.logger.verbose("writing content " + content.url + " to " + destination);
        mkdirp.sync(path.dirname(destination));
        var writeStream = fs.createWriteStream(destination);
        if (result instanceof Stream) {
          return yield pump(result, writeStream);
        } else {
          return yield Promise.promisify(writeStream.end
            , {context: writeStream})(result);
        }
      } else {
        env.logger.verbose("skipping " + content.url);
      }
    });

    var items = ContentTree.flatten(contents);
    return yield Promise.all(items.map(function(item){
      return renderPlugin(item);
    }));
  })();
}

module.exports = {
  render,
  renderView
};

// /* renderer.coffee */

// (function() {
//   var ContentTree, Stream, async, extend, fs, mkdirp, path, pump, ref, render, renderView, setImmediate, util;  

//   render = function(env, outputDir, contents, templates, locals, callback) {

//     /* Render *contents* and *templates* using environment *env* to *outputDir*.
//         The output directory will be created if it does not exist.
//      */
//     var items, renderPlugin;
//     env.logger.info("rendering tree:\n" + (ContentTree.inspect(contents, 1)) + "\n");
//     env.logger.verbose("render output directory: " + outputDir);
//     renderPlugin = function(content, callback) {

//       /* render *content* plugin, calls *callback* with true if a file is written; otherwise false. */
//       return renderView(env, content, locals, contents, templates, function(error, result) {
//         var destination, writeStream;
//         if (error) {
//           return callback(error);
//         } else if (result instanceof Stream || result instanceof Buffer) {
//           destination = path.join(outputDir, content.filename);
//           env.logger.verbose("writing content " + content.url + " to " + destination);
//           mkdirp.sync(path.dirname(destination));
//           writeStream = fs.createWriteStream(destination);
//           if (result instanceof Stream) {
//             return pump(result, writeStream, callback);
//           } else {
//             return writeStream.end(result, callback);
//           }
//         } else {
//           env.logger.verbose("skipping " + content.url);
//           return callback();
//         }
//       });
//     };
//     items = ContentTree.flatten(contents);
//     return async.forEachLimit(items, env.config._fileLimit, renderPlugin, callback);
//   };


//   /* Exports */

//   module.exports = {
//     render: render,
//     renderView: renderView
//   };

// }).call(this);
