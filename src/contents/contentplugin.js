let url = require('url')

module.exports = function(util, config){
  let {defineProperty, readOnlyProperty, replaceSeparatorIfWin32} = util;
  
  class ContentPlugin{
    constructor(filepath){
      util.assertFilepath(filepath);
      ContentPlugin.defineProperties(this, filepath);
    }
    getView() {
      throw new Error('Not implemented.');
    }
    getFilename() {
      throw new Error('Not implemented.');
    }
    getUrl(base){
      let filename = replaceSeparatorIfWin32(this.filename);
      base = base || config.baseUrl;
      if (!base.match(/\/$/)) {
        base += '/';
      }
      return url.resolve(base, filename);
    }
    setBase(env, plugin, filename){
      this.__env = env;
      this.__plugin = plugin;
      this.__filename = filename;
    }
    static defineProperties(self, filepath){
      defineProperty(self, 'filepath', {writable: false, value: filepath});
      defineProperty(self, 'parent', {writable: true});
      defineProperty(self, 'setParent', {writable: false, value(value){
          this.parent = value;
        }
      });
    }
    static fromFile(filepath) {
      throw new Error('Not implemented.');
    }
  }
  
  readOnlyProperty(ContentPlugin.prototype, 'view', 'getView');
  readOnlyProperty(ContentPlugin.prototype, 'filename', 'getFilename');
  readOnlyProperty(ContentPlugin.prototype, 'url', 'getUrl');
  return ContentPlugin;
};