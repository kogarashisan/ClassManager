
// tests are run against all versions. including minified

global.chai = require('chai');
var spies = require('chai-spies');
chai.use(spies);
global.should = chai.should();
global.expect = chai.expect;
global.assert = chai.assert;

var runClassManagerTests = require('./factories/ClassManager');

var NodeModules = {
	ClassManager: require("./../builds/es5/ClassManager"),
};

describe("node.js ClassManager", function () {
	runClassManagerTests(NodeModules);
});
