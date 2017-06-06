var {ContentPlugin, ContentTree} = require('./content');

var runGenerator = function(env, contents, generator){
  var groups = env.getContentGroups();
  var resolve = function(root, items){
    var results = [];
    for (key in items) {
      item = items[key];
      if (item instanceof ContentPlugin) {
        item.parent = root;
        item.__env = env;
        item.__filename = 'generator';
        item.__plugin = generator;
        root[key] = item;
        results.push(root._[generator.group].push(item));
      } else if (item instanceof Object) {
        tree = new ContentTree(key, groups);
        tree.parent = root;
        tree.parent._.directories.push(tree);
        root[key] = tree;
        results.push(resolve(root[key], item));
      } else {
        throw new Error("Invalid item for '" + key + "' encountered when resolving generator output");
      }
    }
    return results;
  }
  var generated = generator.fn(contents);
  var tree = new ContentTree('', groups);
  resolve(tree, generated);
  return tree;
}

module.exports = {
  runGenerator: runGenerator
};
