module.exports = function(){
  class TemplatePlugin{
    render(){
      throw new Error('Not implemented.');
    }
    static fromFile(){
      throw new Error('Not implemented.');
    }
  }
  return TemplatePlugin;
}