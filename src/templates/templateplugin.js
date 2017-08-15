module.exports = function(util){
  class TemplatePlugin{
    constructor(filepath){
      util.assertFilepath(filepath);
      this.filepath = filepath;
    }
    render(){
      throw new Error('Not implemented.');
    }
    static fromFile(){
      throw new Error('Not implemented.');
    }
  }
  return TemplatePlugin;
}