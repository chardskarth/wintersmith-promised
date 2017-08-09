module.exports = function(env){
  
  class ResultHelper{
    constructor(knownMethods, body, err){
      this.knownMethods = knownMethods;
      this.body = body;
      this.error = err;
    }
    setSuccessStatusCode(methodName = "default", successCode){
      methodName = methodName.toUpperCase();
      this.knownMethods[methodName].successStatusCode = successCode;
    }
    getResponseBody(){  
      if(this.error){
        for(let errorKey of Object.getOwnPropertyNames(this.error)){
          if(env.config.suppressStackMessage && errorKey === "stack"){
            continue;
          }
          this.body[errorKey] = this.error[errorKey]
        }
      }
      return this.body;
    }
    setError(err){
      this.error = err;
    }
    getStatusCode(methodName = "default"){
      methodName = methodName.toUpperCase();
      let retVal;
      let defaultRetVal = 500;
      let defaultSuccess = 200;
      let method = this.knownMethods[methodName];
      if(!method){
        throw new Error(`${methodName} is not registered method in ResultHelper`)
      }
      let error = this.error;
      if(!error){//(typeof error === "undefined"){
        retVal = method.successStatusCode || defaultSuccess;
      } else {
        let knownError = method.knownErrors.find(({arrErrorMessage}) => {
          return arrErrorMessage
            .every(x => {
              return error.message.toUpperCase().indexOf(x) != -1;
            });
        });
        if(!knownError){
          retVal = defaultRetVal
        } else {
          retVal = knownError.errorCode;
        }
      }
      return retVal;
    }
  }

  return function ResultHelperFactory(){
    let knownMethods = {};
    function createInstance(err, body){
      return new ResultHelper(knownMethods, body, err)
    }
    function addMethod(methodName = "default"){
      methodName = methodName.toUpperCase();
      let method = knownMethods[methodName] = {
        knownErrors:[]
      };
      return Object.create({
        successCode(successCode){
          method.successStatusCode = successCode;
          return this;
        }
        , addKnownError(arrErrorMessage, errorCode){
          arrErrorMessage = arrErrorMessage.map(x => x.toUpperCase())
          method.knownErrors.push({arrErrorMessage, errorCode})
          return this;
        }
      });
    }
    return {createInstance, ResultHelper, addMethod};
  }
}
