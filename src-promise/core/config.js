var fs = require('fs');
var path = require('path');
var {readJSON, readJSONSync, fileExists, fileExistsSync} = require('./utils');

class Config {
  constructor(options = {}){
    Object.assign(this, Config.defaults, options);
  }
  static fromFile(path){
    /* Read config from *path* as JSON return a Config instance. */
    var config;
    if (!fileExistsSync(path)) {
      throw new Error("Config file at '" + path + "' does not exist.");
    }
    config = new Config(readJSONSync(path));
    config.__filename = path;
    return config;
  }
  static initClass(){
    Config.defaults = {
      contents: './contents',
      ignore: [],
      locals: {},
      plugins: [],
      require: {},
      templates: './templates',
      views: null,
      output: './build',
      baseUrl: '/',
      hostname: null,
      port: 8080,
      _fileLimit: 40,
      _restartOnConfChange: true
    };
  }
}
Config.initClass();
module.exports = {Config};