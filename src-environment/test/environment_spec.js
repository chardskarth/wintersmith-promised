var chai = require("chai")
var should = chai.should()
var assert = chai.assert
var expect = chai.expect
var Promise = require("bluebird")
var _ = require("lodash")
var {shouldThrow} = require('./util')
var path = require('path')
var {join} = path;
var {mkdirSync, readFileSync} = require('fs');
var copydir = require('copy-dir');
var del = require('node-delete');
var mvPromise = Promise.promisify(require('mv'));
var mv = function(from, to, opts){
  opts = opts || {};
  from = join(TEST_ENV_FOLDER_DEST, from);
  to = join(TEST_ENV_FOLDER_DEST, to);
  return mvPromise(from, to, opts);
}

const TEST_ENV_FOLDER_TEMPLATE = join(__dirname, "./test-environment-folder-template");
const TEST_ENV_FOLDER_DEST = join(__dirname, "./test-environment");

var Environment = require(join(__dirname, "../environment"));

(function(Environment){
  describe('Environment', function(){
    function rebuildTemplate(){
      try{
        mkdirSync(TEST_ENV_FOLDER_DEST);
      } catch(err){}
      copydir.sync(TEST_ENV_FOLDER_TEMPLATE, TEST_ENV_FOLDER_DEST);
    }
    before(rebuildTemplate)
    after(function(){
      del.sync(TEST_ENV_FOLDER_DEST);
    })
    describe("createInstance", function(){
      it("Should throw if config.json is not existing", function(){
        del.sync(join(TEST_ENV_FOLDER_DEST, "config.json"));
        shouldThrow(function(){
          Environment.createInstance(TEST_ENV_FOLDER_DEST)
        }, (err) => {
          expect(err.message).to.equal("config(.json|.js) must exist in path");
        })
      })
      it("Should load config.js if config.json is not found", function(){
        rebuildTemplate();
        mv("config.json", "config.js");
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        expect(env).to.be.instanceOf(Environment);
        expect(env.config.opts).to.deep.equal({"beTrue": true, "beFalse": true  });
      });
      it("Should not throw if override configs is not existing", function(){
        rebuildTemplate();
        del.sync(join(TEST_ENV_FOLDER_DEST, "config-live.json"));
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        expect(env.config.opts.beTrue).to.be.false;
      });
      
      it("Should override configs if existing", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        expect(env.config.opts.beTrue).to.be.true;
      });
      it("Should load override configs if *.js is given", function(){
        rebuildTemplate();
        mv("config-live.json", "config-live.js");
        mv("config-liveisjs.json", "config.js");
        del.sync(join(TEST_ENV_FOLDER_DEST, "config.json"));
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        expect(env.config.opts.beTrue).to.be.true;
      });
      it("Should set default logger", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        expect(env.logger).to.exist;
      });
      it("Should set default cwdutil", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        expect(env.cwdutil).to.exist;
      })
      it("Should call onBeforeInit if existing", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST, function(env){
          env.initedHere = true;
        })
        expect(env.cwdutil).to.exist;
        expect(env.initedHere).to.be.true;
      })
      describe("init() on createInstance", function(){
        it("Should not throw if 'init' is not specified in config", function(){
          rebuildTemplate();
          return Promise.coroutine(function* (){
            yield mv("config-noinit.json", "config.json");
            let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
            expect(env.inited).to.not.exist;
          })()
        })
        it("Should run 'init' specified in config", function(){
          rebuildTemplate();
          return Promise.coroutine(function* (){
            let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
            expect(env.inited).to.be.true;
          })()
        })
      })
    });
    describe("get & set", function(){
      it("get Should throw if key is not yet existing", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        shouldThrow(function(){
          env.get("abc");
        }, function(err){
          expect(err.message).to.include('abc');
          expect(err.message).to.include('not yet set');
        });
      });
      it("get Should return array if multiple keys given", function(){
        rebuildTemplate();
        let letters = 'abcd';
        let numbers = '1234';
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        env.set('letters', letters);
        env.set('numbers', numbers);
        env.set('env', env);
        let [letters2, numbers2, env2] = env.get('letters', 'numbers', 'env');
        expect(env2).to.equal(env);
        expect(letters2).to.deep.equal(letters);
        expect(numbers2).to.deep.equal(numbers);
      });
      it("set Should throw if passed an incorrect argument", function(){
        rebuildTemplate();
        [true, false, undefined, ["key", "value"]]
        .forEach((arg) => {
          shouldThrow(function(){
            let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
            env.set(arg);
          }, function(err){
            expect(err.message).to.include('set must be called with');
          });
        });
      });
      it("set Should throw if key is already existing", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        env.set("abc", 123);
        shouldThrow(function(){
          env.set("abc", "abcd");
        });
      });
      it("set Should return the expected value", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        env.set("abc", 123);
        expect(env.get("abc")).to.equal(123);
      });
      it("set Should work on object like 'destructuring assignment'", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST);
        let letters = 'abcd';
        let numbers = '1234';
        let arr = [true, false, undefined, null];
        env.set({letters, numbers, arr, env});
        let letters2 = env.get('letters');
        let numbers2 = env.get('numbers');
        let arr2 = env.get('arr');
        let env2 = env.get('env');
        expect(env2).to.equal(env);
        expect(letters2).to.deep.equal(letters);
        expect(numbers2).to.deep.equal(numbers);
        expect(arr2).to.deep.equal(arr);
      });
      it("set should be atomic in setting multiple values", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST);
        let letters = 'abcd';
        let numbers = '1234';
        let arr = [true, false, undefined, null];
        env.set('letters', letters);
        env.set('numbers', numbers);
        shouldThrow(function(){
          env.set({letters, numbers, arr, env});
        }, function(err){
          expect(err.message).to.include('letters');
          expect(err.message).to.include('numbers');
          expect(err.message).to.include('already existing');
        });
        shouldThrow(function(){
          return env.get('arr');
        }, function(err){
          expect(err.message).to.equal('arr not yet set');
        });
        shouldThrow(function(){
          return env.get('env');
        }, function(err){
          expect(err.message).to.equal('env not yet set');
        });
      });
    });
    
    describe("require", function(){
      it("Should look for relative path of environment's cwd", function(){
        rebuildTemplate();
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        let overridenPath = env.require("path");
        expect(overridenPath).to.not.equal(path);
        expect(overridenPath).to.equal("override");
      })
      it("if not found, should look for node_modules of environment's cwd", function(){
        rebuildTemplate();
        // nodejs caches the previously loaded path module, so we must delete it
        let pathPath = join(TEST_ENV_FOLDER_DEST, "path.js");
        delete require.cache[pathPath]
        del.sync(pathPath);

        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        let overridenPath = env.require("path");
        expect(overridenPath).to.not.equal(path);
        expect(overridenPath).to.equal("path");
      })
      it("if not found, should then delegate to node's default require", function(){
        rebuildTemplate();
        // nodejs caches the previously loaded path module, so we must delete it
        let pathPath = join(TEST_ENV_FOLDER_DEST, "path.js");
        delete require.cache[pathPath]
        del.sync(pathPath);
        pathPath = join(TEST_ENV_FOLDER_DEST, "node_modules", "path");
        delete require.cache[join(TEST_ENV_FOLDER_DEST, "node_modules", "path", "index.js")]
        del.sync(pathPath);
        
        let env = Environment.createInstance(TEST_ENV_FOLDER_DEST)
        let overridenPath = env.require("path");
        expect(overridenPath).to.equal(path);
      })
    });
  });
})(Environment)
