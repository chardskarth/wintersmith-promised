(function() {
  var {ContentTree, ContentPlugin} = require('./core/content');
  var {Environment} = require('./core/environment');
  var {TemplatePlugin} = require('./core/templates');
  var Promise = require('bluebird');

  Promise.config({
    longStackTraces: true
  });

  module.exports = function() {
    return Environment.create.apply(null, arguments);
  };

  module.exports.Environment = Environment;
  module.exports.ContentPlugin = ContentPlugin;
  module.exports.ContentTree = ContentTree;
  module.exports.TemplatePlugin = TemplatePlugin;

}).call(this);
