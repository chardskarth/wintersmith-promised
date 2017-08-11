let chai = require("chai");
let expect = chai.expect;
let {shouldThrow, createTemplateRebuilder, createDeleteSync} = require('./util');
let assert = require('assert');
let path = require('path')
let {join} = path;

let Injector = require("./../src/injector");
let Promise = require('bluebird');
let Environment = require("./../src-environment/environment");
let env = Environment.createInstance();
