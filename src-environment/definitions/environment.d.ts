interface Environment_Static {
  new(): Environment_Instance;
  createInstance(envPath: any, onBeforeInit: any): Environment_Instance;
  _mergeOverrideConfigs(config: any, readFileCWD: any): any;
}
interface Environment_Instance extends Map<any, any> {
  // get(key: any): any;
  // set(key: any, value: any): void;
}

// declare var Environment: Environment_Static;
// declare module "Environment"{
//   export = Environment_Static;
// }