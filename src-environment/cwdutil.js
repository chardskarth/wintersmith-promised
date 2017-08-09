let {join, parse, sep, resolve, relative, isAbsolute} = require('path');
let {readFileSync, readdirSync, statSync} = require('fs');

//contained so you can change the CWD
module.exports = function getCWDHelper(_cwd){
  let requireCWD = function(toReq){
    if(isAbsolute(toReq)){
      throw new Error('requireCWD does not accept absolutePaths')
    }
    let getRetVal = () => {
      let retVal= require(resolve(process.cwd(), _cwd, toReq)) //require(join(_cwd, toReq)) 
      return retVal;
    }
    let retVal;
    while(true){
      // we first try to look at the required module at the relative path of _cwd
      try{
        retVal = getRetVal();
        break;
      } catch(err){
        if((err.message.indexOf(`Cannot find module`) !== -1
            || err.message.indexOf(`ENOENT`) !== -1)
            && err.message.indexOf(`${toReq}`) !== -1){
          getRetVal = () => require(resolve(process.cwd(), _cwd, 'node_modules', toReq))//require(join(_cwd, 'node_modules', toReq))
        } else {
          throw err;
        }
      }
      // if not found, we try to look at this _cwd's node_modules
      try{
        retVal = getRetVal();
        break;
      } catch(err){
        if((err.message.indexOf(`Cannot find module`) !== -1
            || err.message.indexOf(`ENOENT`) !== -1)
            && err.message.indexOf(`${toReq}`) !== -1){
          getRetVal = () => require(toReq)
        } else {
          throw err;
        }
      }
      // if not yet found, use the normal require
      retVal = getRetVal();
      break;
    }
    return retVal;
  }

  let readFileCWD = function(toRead){
    if(isAbsolute(toRead)){
      throw new Error('readFileCWD does not accept absolutePaths')
    }
    return readFileSync(join(_cwd, toRead)).toString();
  }

  let resolveCWD = function(toResolve){
    if(isAbsolute(toResolve)){
      throw new Error('resolveCWD does not accept absolutePaths')
    }
    return resolve(_cwd, toResolve);
  }

  let walkDirSync = function (directory) {
    if(isAbsolute(directory)){
      throw new Error('walkDirSync does not accept absolutePaths')
    }
    let retVal = [];
    function walk(curDir){
      readdirSync(join(_cwd, directory, curDir))
        .forEach(filename => {
          let relativePath = join(curDir, filename);  
          let stat = statSync(join(_cwd, directory, relativePath));
          if(stat.isDirectory()) {
            walk(relativePath);
          } else {
            let {base, dir, ext, name} = parse(relativePath);
            let fullPath = join(directory, relativePath);
            retVal.push({base, dir, ext, name, relativePath, fullPath});
          }
        })
    }
    walk("");
    return retVal;
  }

  let readDirSync = function(directory){
    if(isAbsolute(directory)){
      throw new Error('readDirSync does not accept absolutePaths')
    }
    return readdirSync(join(_cwd, directory)).map(relativePath => {
      let {base, dir, ext, name} = parse(relativePath);
      let fullPath = join(directory, relativePath);
      return {base, dir, ext, name, relativePath, fullPath}
    });
  }

  function isFileExist(filePath){
    if(isAbsolute(filePath)){
      throw new Error('isFileExist does not accept absolutePaths')
    }
    let retVal = false;
    filePath = join(_cwd, filePath);
    try{
      statSync(filePath);
      retVal = true;
    } catch(err){}
    return retVal;
  }

  return { 
    requireCWD
    , readFileCWD
    , resolveCWD
    , walkDirSync
    , readDirSync
    , isFileExist
  }
};