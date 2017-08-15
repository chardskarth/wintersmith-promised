function isFunction(toCheck){
  return toString.call(toCheck) === "[object Function]";
}

function isObject(obj) {
  var typeOf = typeof obj;
  return obj && typeOf === "object" && !Array.isArray(obj);
}

module.exports = {isFunction, isObject};