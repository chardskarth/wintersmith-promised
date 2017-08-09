var Promise = require("bluebird");

exports.shouldReject = function(fn, cb) {
  return Promise.coroutine(function *() {
    try{
      yield fn();
      throw Error("function should throw");
    }catch(err){
      if(err.message.indexOf("function should throw") != -1){
        throw err;
      }
      typeof cb === "function" && cb(err);
    }
  })();
};
exports.shouldRejectType = function ( errType, errSubtype, fn ) {
  return Promise.coroutine(function* (){
    yield exports.shouldReject(fn, function(err) {
      expect(err).to.be.instanceOf(errType);
      expect(err.type).to.equal(errSubtype);
    });
  })();
};

exports.shouldThrow = function(fn, cb) {
  try{
    fn();
    throw Error("function should throw");
  }catch(err){
    if(err.message.indexOf("function should throw") != -1){
      throw err;
    }
    typeof cb === "function" && cb(err);
  }
};