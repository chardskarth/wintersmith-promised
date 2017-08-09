interface Config_Static {
  new(): Config_Instance;
  createInstance(configObj: any): Config_Instance;
}
interface Config_Instance {
  
}

// declare var Config: Config_Static;
// declare module "Config"{
//   export = Config_Static;
// }