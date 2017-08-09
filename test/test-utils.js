let {join} = require('path');
let utils = require(join(process.cwd(), "./src/utils"));
let {expect} = require("chai");


describe("utils", function(){
  it("Should have the known functions", function(){
    expect(utils).to.have.keys("readOnlyProperty", "replaceSeparatorIfWin32");
  })
  it("Should have readOnlyProperty", function(){
    expect(utils.readOnlyProperty).to.be.a("function");
  })
  it("Should have replaceSeparatorIfWin32", function(){
    expect(utils.replaceSeparatorIfWin32).to.be.a("function");
  })
})