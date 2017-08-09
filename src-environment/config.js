const CONFIG_PATH = "config.json"

class Config{
  constructor(obj){
    Object.assign(this, obj);
  }
  static createInstance(configObj){
    return new Config(configObj);
  }
}

module.exports = Config;