
module.exports = function(grunt) {

	var KNOWN_DEPENDENCIES = [
		'Firestorm.extend',
		'Firestorm.implement',
		'Firestorm.getType',
		'Firestorm.String.quote',
		'Firestorm.Object.copy',
		'Firestorm.Object.isEmpty',
		'Lava.schema.DEBUG',
		'Lava.t',
		'Lava.VALID_PROPERTY_NAME_REGEX.test',
		'Lava.JS_KEYWORDS.indexOf',
		'Lava.ClassManager',
		'Lava.ClassManager.getClassData',
		'Lava.widget"' // in comment
	];

	grunt.registerTask('buildStandaloneClassManager', global.bug1135(function() {

		var Lava = require('lava'),
			Firestorm = Lava.getFirestorm(),
			class_manager_src = grunt.file.read(global.LAVA_CORE_PATH + "src/ClassManager.js"),
			wrapper_content = grunt.file.read('build/wrapper.js');

		// it's better to do it with Esprima or something...
		var references = class_manager_src.match(/(Lava|Firestorm)\.[^\(\)\s\#\<\>)]+/g);
		references.forEach(function(reference) {
			if (KNOWN_DEPENDENCIES.indexOf(reference) == -1) {
				Lava.t("unknown reference: " + reference);
			}
		});

		var firestorm_export = {
			extend: Firestorm.extend, // no dependencies
			implement: Firestorm.implement, // no dependencies

			_descriptor_to_type: Firestorm._descriptor_to_type, // needed by Firestorm.getType
			getType: Firestorm.getType,

			String: {
				quote_escape_map: Firestorm.String.quote_escape_map, // needed by quote
				QUOTE_ESCAPE_REGEX: Firestorm.String.QUOTE_ESCAPE_REGEX, // needed by quote
				quote: Firestorm.String.quote
			},

			Object: {
				copy: Firestorm.Object.copy,
				isEmpty: Firestorm.Object.isEmpty
			}
		};

		var lava_export = {
			schema: {
				DEBUG: true
			},
			t: Lava.t,
			VALID_PROPERTY_NAME_REGEX: Lava.VALID_PROPERTY_NAME_REGEX,
			JS_KEYWORDS: Lava.JS_KEYWORDS,
			ClassManager: null,
			instanceOf: Lava.instanceOf
		};

		var tmp = wrapper_content.split("/*<%content%>*/");

		var result =
			tmp[0]
			+ "var Firestorm = " + Lava.serializer.serialize(firestorm_export) + ";\n\n"
			+ "var Lava = " + Lava.serializer.serialize(lava_export) + ";\n"
			+ class_manager_src
			+ tmp[1];

		grunt.file.write("lib/class_manager.js", result);

	}));

};