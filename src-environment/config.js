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

// export class Config {
//     public readonly data: any;
//     constructor(path: string, name: string, defaultName: string = 'default') {
//         try {
//             this.data = require(`./../../${path}/${name}`);
//         }
//         catch (err) {
//             try {
//                 console.log(`WARNING: Config File '${path}/${name}' not found, using default.json config instead.`);
//                 this.data = require(`./../../${path}/${defaultName}`);
//             }
//             catch (err2) {
//                 throw Error(`Config File: '${path}/${defaultName}' not found. Description: ${err2}`);
//             }
//         }
//     }
// }
