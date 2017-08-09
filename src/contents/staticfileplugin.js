let fs = require('fs');

module.exports = function(ContentPlugin){
  class StaticFile extends ContentPlugin{
    constructor(filepath){
      super();
      this.filepath = filepath;
    }
    getView(){
      return function(...args) {
        return fs.createReadStream(this.filepath.full);
      };
    }
    getFilename(){
      return this.filepath.relative;
    }
    static fromFile (filepath) {
      return new StaticFile(filepath);
    };
  }
  return StaticFile;
}