"use strict";

let { relative, resolve, join, basename, parse } = require('path');
let { readFileSync, existsSync, readdir, stat } = require('fs');
let _ = require("lodash");
let Promise = require('bluebird');
let chalk = require('chalk');
let assert = require('assert');

let whenReaddir = Promise.promisify(readdir);
let whenStat = Promise.promisify(stat);

module.exports = function (logger) {
  let mainHelpers = {};

  function registerFunctionsToMainHelpers(obj) {
    _.forOwn(obj, function (value, key) {
      mainHelpers[key] = value.bind(mainHelpers);
    });
  }

  let retVal = {
    tryLoadFile(filePath, foundMessage, failMessage) {
      let retVal = {};
      if (this.fileExistsSync(filePath)) {
        logger.info(`${foundMessage}` + filePath);
        retVal = this.readJSONSync(filePath);
      } else {
        logger.verbose(failMessage);
      }
      return retVal;
    }
    , ensurePathsExist(...toExist) {
      let self = this;
      toExist.forEach(function ([pathname, fullPath]) {
        var exists = self.fileExistsSync(fullPath);
        if (!exists) {
          throw new Error(pathname + " path invalid (" + fullPath + ")");
        }
      });
    }
    , replaceSeparatorIfWin32(filename) {
      if (process.platform === 'win32') {
        filename = filename.replace(/\\/g, '/');
      }
      return filename
    }
    , colorCode(code) {
      switch (Math.floor(code)) {
        case 200:
          return chalk.green(code);
        case 400:
          return chalk.yellow(code);
        case 500:
          return chalk.red(code);
        default:
          return code.toString();
      }
    }
    , normalizeUrl(anUrl) {
      if (anUrl[anUrl.length - 1] === '/') {
        anUrl += 'index.html';
      }
      if (anUrl.match(/^([^.]*[^\/])$/)) {
        anUrl += '/index.html';
      }
      anUrl = decodeURI(anUrl);
      return anUrl;
    }
    , buildLookupMap(contents) {
      let retValMap = {};
      let flat = this.contentTreeFlatten(contents);
      for (let i = 0; i < flat.length; i++) {
        let item = flat[i];
        retValMap[this.normalizeUrl(item.url)] = item;
      }
      return retValMap;
    }
    , pump(source, destination) {
      let defer = Promise.defer();
      source.pipe(destination);
      source.on('error', function (error) {
        defer.reject(error);
      });
      destination.on('finish', function () {
        defer.resolve();
      });
      return defer.promise;
    }
  };

  let assertHelpers = {
    assertFilepath(toCheck) {
      this.assertIsObject(toCheck, "filepath should be {relative<String>, full<String>");
      this.assertIsString(toCheck.relative, "filepath must have relative<String>");
      this.assertIsString(toCheck.full, "filepath must have full<String>");
    }
    , assertIsString(toCheck, message){
      message = message || undefined;
      assert(toCheck && _.isString(toCheck), message);
    }
    , assertIsFunction(toCheck, message){
      message = message || "assert isFunction failed";
      return assert.equal(toString.call(toCheck), "[object Function]"
        , message);
    }
    , assertIsObject(obj, message) {
      message = message || "assert isObject failed";
      let typeOf = typeof obj;
      let isObject = obj && typeOf === "object" && !Array.isArray(obj);
      assert(isObject, message)
    }
  }

let createPropertyHelpers = {
  defineProperty(obj, name, descriptor) {
    Object.defineProperty(obj, name, descriptor);
  }
  , readOnlyProperty(obj, name, getter) {
    let get;
    let enumerable = false;
    if (typeof getter === "string") {
      get = function () {
        return this[getter].call(this);
      };
    } else if (typeof getter === "function") {
      get = function () {
        return getter.call(this);
      }
    } else if (typeof getter === "undefined") {
      get = undefined;
    } else {
      throw new Error("readOnlyProperty getter function must be a string or function only");
    }
    if (typeof get === "undefined") {
      Object.defineProperty(obj, name, { writable: false, enumerable });
    } else {
      Object.defineProperty(obj, name, { get, enumerable });
    }
  }
  , writableProperty(obj, name) {
    let enumerable = false;
    let writable = true;
    this.defineProperty(obj, name, { writable, enumerable });
  }
}

let fileHelpers = {
  readJSONSync(filename) {
    var buffer = readFileSync(filename);
    return JSON.parse(buffer.toString());
  }
  , readDirectory(directory) {
    return whenReaddir(directory);
  }
  , readDirectoryRecursive(directory) {
    let result = [];
    let self = this;
    let walk = function*(dir){
      let filenames = yield self.readDirectory(join(directory, dir));
      return Promise.map(filenames, function(filename){
        var relname = join(dir, filename);
        return Promise.props({
          relname, stat: whenStat(join(directory, relname))
        })
      })
      .each(function({relname, stat}){
        if (stat.isDirectory()) {
          return Promise.coroutine(walk)(relname);
        } else {
          return result.push(relname);
        }
      });
    }
    return Promise.coroutine(walk)('')
      .then( () => result );
  }
  , readDirectoryAndResolve(directory, relativeDirectory, isRecursive) {
    let args = Array.from(arguments);
    let self = this;
    return Promise.coroutine(function* (){
      if (args.length === 1 || typeof relativeDirectory === "boolean") {
        isRecursive = relativeDirectory || false;
        relativeDirectory = directory;
      }
      let filenames = isRecursive
        ? yield self.readDirectoryRecursive(directory)
        : yield self.readDirectory(directory);
      let reldir = self.pathRelative(relativeDirectory, directory)
      filenames.sort();
      return filenames.map((filename) => {
        return {
          full: join(directory, filename)
          , relative: join(reldir, filename)
        }
      });
    })();
  }
  , directoryStat({ full }) {
    return whenStat(full)
      .then(x => x.isDirectory());
  }
  , getDirectoryName({ full }) {
    return this.pathBasename(full);
  }
  , fileExistsSync: existsSync
}

let pathHelpers = {
  pathResolve: resolve
  , pathRelative: relative
  , pathJoin: join
  , pathParse: parse
  , pathBasename: basename
}

registerFunctionsToMainHelpers(retVal);
registerFunctionsToMainHelpers(assertHelpers);
registerFunctionsToMainHelpers(createPropertyHelpers);
registerFunctionsToMainHelpers(fileHelpers);
registerFunctionsToMainHelpers(pathHelpers);
return mainHelpers;
}
