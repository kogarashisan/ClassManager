
// workaround for a bug in Grunt, https://github.com/gruntjs/grunt/issues/1135
global.bug1135 = function(callback) {
	return function() {
		try {
			return callback();
		} catch (e) {
			if (typeof(e) == 'string' || typeof(e) == 'number') throw new Error(e);
			throw e;
		}
	}
};

global.LAVA_CORE_PATH = "D:/LiquidLava/";

module.exports = function(grunt) {

	grunt.option('stack', true);
	grunt.loadTasks('build/tasks/');

	grunt.registerTask('default', ['buildStandaloneClassManager']);

};