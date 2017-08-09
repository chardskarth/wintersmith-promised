module.exports = function(util){
  let {defineProperty} = util;
  class ContentTree{
    constructor(directoryName){
      ContentTree.defineProperties(this, directoryName);
    }
  }
  ContentTree.defineProperties = function(self, directoryName){
    defineProperty(self, 'directoryName', {writable: false, value: directoryName});
    defineProperty(self, '_directories', {writable: false, value: []});
    defineProperty(self, '_files', {writable: false, value: []});
    defineProperty(self, 'parent', {writable: true});
    defineProperty(self, 'setParent', {writable: false, value(value){
        this.parent = value;
      }
    });
    defineProperty(self, 'addDirectory', {
      value: function(basename, toAdd){
        this._directories.push(toAdd);
        this[basename] = toAdd
      }
    });
    defineProperty(self, 'addFile', {
      value: function(basename, toAdd){
        this._files.push(toAdd);
        this[basename] = toAdd
      }
    });
  }

  return ContentTree;
}