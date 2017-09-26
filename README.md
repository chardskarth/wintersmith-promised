## Intro

This is all based on Johan Nordberg's Wintersmith. It is **exactly** the same. I just converted mostly to promises for the ff reasons:

- I plan to use it personally to extend its functionalities, *more than* being a static site generator. 
- I didn't like callbacks. Going to need a better code base to understand how he did everything. (Its originally written in coffeescript);
- I wanted to learn and train myself... read his code and converted.

## Resources

 * [Project site][website]
 * [API Documentation][docs]
 * [Wiki][wiki]
 * [stackoverflow tag](http://stackoverflow.com/questions/tagged/wintersmith)
 * IRC - **#wintersmith** on freenode

[website]: http://wintersmith.io "Wintersmith project website"
[docs]: http://wintersmith.io/docs "Wintersmith API Documentation"
[wiki]: https://github.com/jnordberg/wintersmith/wiki "Wintersmith wiki"
[plugin-listing]: https://github.com/jnordberg/wintersmith/wiki/Plugins "Wintersmith plugin listing"
[plugin-guide]: https://github.com/jnordberg/wintersmith/wiki/Writing-plugins "Wintersmith plugin guide"

## Options
Name                  | Default         | Description
----------------------|-----------------|-----------------------------------------------
contents              | `./contents`    | contents directory location
templates             | `./templates`   | templates directory location
views                 | `null`          | views directory location, optional
locals                | `{}`            | global site variables, can also be a path to a json file
require               | `{}`            | modules to load and add to locals. e.g. if you want underscore as `_` you would say `{"_": "underscore"}`
plugins               | `[]`            | list of plugins to load
ignore                | `[]`            | list of files or pattern to ignore
output                | `./build`       | output directory, this is where the generated site is output when building
filenameTemplate      | `:file.html`| outputs filenames and paths according to a template. ([documentation](https://github.com/jnordberg/wintersmith/wiki/Page-Plugin#filename-templating))
introCutoffs          | `['<span class="more', '<h2', '<hr']` | list of strings to search for when determining if a page has an intro
baseUrl               | `/`             | base url that site lives on, e.g. `/blog/`.
hostname              | `null`          | hostname to bind preview server to, null = INADDR_ANY
port                  | `8080`          | port preview server listens on
noWatchContents       | `undefined`     | if true, wintersmith will not watch changes in Contents to automatically reload
noWatchTemplates      | `undefined`     | if true, wintersmith will not watch changes in Templates to automatically reload 
noWatchViews          | `undefined`     | if true, wintersmith will not watch changes in Views to automatically reload
alwaysReloadContents  | `undefined`     | if true, will remove cached contents after `removeCacheAfterLoad` expires
alwaysReloadTemplates | `undefined`     | if true, will remove cached templates after `removeCacheAfterLoad` expires
alwaysReloadViews     | `undefined`     | *not yet working*
removeCacheAfterLoad  | `undefined`     | must be set a `Milisecond` to wait until trying to remove cache
