var path = require('path');
var stream = require('stream');
var _ = require('lodash');
var configDefaults = require("./../config-defaults");
// var {Config} = require('./../core/config');
// var {Environment} = require('./../core/environment');
// var {logger} = require('./../core/logger');
// var {fileExistsSync} = require('./../core/utils')

var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
var hasProp = {}.hasOwnProperty;

exports.configDefaults = configDefaults;

exports.commonOptions = defaults = {
  string: ['chdir', 'config', 'contents', 'templates', 'locals', 'require', 'plugins', 'ignore'],
  "default": {
    config: './config.json',
    chdir: null
  },
  alias: {
    config: 'c',
    chdir: 'C',
    contents: 'i',
    templates: 't',
    locals: 'L',
    require: 'R',
    plugins: 'P',
    ignore: 'I'
  }
};

exports.commonUsage = [
  "-C, --chdir [path]            change the working directory",
  "  -c, --config [path]           path to config (defaults to #{ defaults.default.config })",
  "  -i, --contents [path]         contents location (defaults to #{ Config.defaults.contents })",
  "  -t, --templates [path]        template location (defaults to #{ Config.defaults.templates })",
  "  -L, --locals [path]           optional path to json file containing template context data",
  "  -R, --require                 comma separated list of modules to add to the template context",
  "  -P, --plugins                 comma separated list of modules to load as plugins",
  "  -I, --ignore                  comma separated list of files/glob-patterns to ignore"
].join('\n');

exports.extendOptions = function(base, extra) {
  //TODO: validate for repeating values, possible unwanted alias override

  ['string', 'boolean'].forEach((type) => {
    base[type] = base[type] || [];
    if(extra[type] != undefined){
      base[type] = base[type].concat(extra[type]);
    }
  });

  ['alias', 'default'].forEach((type) => {
    base[type] = base[type] || [];
    if(extra[type] != undefined){
      _.forOwn(extra[type], function(value, key){
        base[type][key] = value;
      });
    }
  });
};

if (stream.Writable == null) {
  stream.Writable = (function(superClass) {
    extend(Writable, superClass);

    function Writable() {
      Writable.__super__.constructor.call(this);
      this.writable = true;
    }

    Writable.prototype.write = function(string, encodig) {
      if (encodig == null) {
        encodig = 'utf8';
      }
      return this._write(string, encodig, function() {});
    };

    return Writable;

  })(stream.Stream);
}

exports.NpmAdapter = NpmAdapter = (function(superClass) {
  extend(NpmAdapter, superClass);


  /* Redirects output of npm to a logger */

  function NpmAdapter(logger1) {
    this.logger = logger1;
    this.buffer = '';
    NpmAdapter.__super__.constructor.call(this, {
      decodeStrings: false
    });
  }

  NpmAdapter.prototype._write = function(chunk, encoding, callback) {
    this.buffer += chunk;
    if (chunk.indexOf('\n') !== -1) {
      this.flush();
    }
    return callback();
  };

  NpmAdapter.prototype.flush = function() {
    var i, len, line, lines, results;
    lines = this.buffer.split('\n');
    this.buffer = '';
    results = [];
    for (i = 0, len = lines.length; i < len; i++) {
      line = lines[i];
      if (!(line.length > 0)) {
        continue;
      }
      line = line.replace(/^npm /, '');
      if (line.slice(0, 4) === 'WARN') {
        results.push(this.logger.warn("npm: " + line.slice(5)));
      } else {
        results.push(this.logger.verbose("npm: " + line));
      }
    }
    return results;
  };

  return NpmAdapter;

})(stream.Writable);

exports.getStorageDir = function() {

  /* Return users wintersmith directory, used for cache and user templates. */
  var dir, home;
  if (process.env.WINTERSMITH_PATH != null) {
    return process.env.WINTERSMITH_PATH;
  }
  home = process.env.HOME || process.env.USERPROFILE;
  dir = 'wintersmith';
  if (process.platform !== 'win32') {
    dir = '.' + dir;
  }
  return path.resolve(home, dir);
};
