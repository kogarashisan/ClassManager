
// @todo вынести этот файл на уровень выше

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Custom builder, which is able to build ultra-small over-optimized versions.
// ClassManager uses it's own build script, cause bundlers, like Webpack, will produce slower and heavier packages.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var BuildHelper = require('./BuildHelper'),
	fs = require("fs"),
	name,
	i,
	count,
	vm = require("vm"),
	context = vm.createContext(),
	wrapper_content = BuildHelper.readFile('./wrapper.js'),
	wrapper_parts = wrapper_content.split("/*<%content%>*/"),
	wrapper_raw_content = BuildHelper.readFile('./wrapper-raw.js'),
	wrapper_raw_content_parts = wrapper_raw_content.split("/*<%content%>*/"),
	constants_file_content = BuildHelper.readFile('./../src/constants.js'),
	package_json = BuildHelper.readJSON('./../package.json');

var file_list = [
	'ERROR_DESCRIPTIONS.js',
	'ClassManager.js',
];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// extract constants

vm.runInContext(constants_file_content, context, 'constants.js');

var constants_names = constants_file_content.match(/\_\_[A-Z0-9\_]+\_\_/g),
	constants = {};
for (i = 0, count = constants_names.length; i < count; i++) {
	var constant = constants_names[i];
	constants[constant] = context[constant];
}
constants.__CM_VERSION__ = package_json.version;

//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// @todo check all replaces, one-by-one

function removeHeaderAndFooter(file_content) {
	// for browser: strip node stuff (require, exports, etc)
	var header_marker = "/*:BUILD_HEADER_CUTOFF:*/";
	var index = file_content.indexOf(header_marker);
	if (index != -1) {
		file_content = file_content.substr(index + header_marker.length);
	}
	index = file_content.indexOf("/*:BUILD_FOOTER_CUTOFF:*/");
	if (index != -1) {
		file_content = file_content.substr(0, index);
	}
	return file_content;
}

var files = {},
	browser_files = {};

for (i = 0, count = file_list.length; i < count; i++) {

	var filename = file_list[i];
	var file_content = BuildHelper.readFile('./../src/' + filename);
	files[filename] = file_content;

	file_content = removeHeaderAndFooter(file_content);
	// replace calls to Globals.*
	file_content = file_content.replace(/([^a-zA-Z0-9\$\_\.])Globals\.([a-zA-Z0-9\_\$]+\()/g, function(_, something, function_call) {
		return something + function_call; // function_call without "Globals." prefix
	});
	browser_files[filename] = file_content;

	vm.runInContext(file_content, context, filename);

}

var replace_constants_regex = new RegExp("(" + constants_names.join("|").replace("_", "\\_") + ")", "g");
function replaceConstants(content, constants) {

	var result = content.replace(replace_constants_regex, function(_, constant_name) {

		var constants_value = constants[constant_name],
			type = typeof constants_value;

		if (constants_value === null)
			type = 'null';

		switch (type) {
			case 'number':
			case 'boolean':
			case 'null':
				break; // convert to string as-is
			case 'string':
				constants_value = context.quote(constants_value);
				break;
			default:
				throw new Error();
		}

		return constants_value;
	});

	// conditionally include comments for unit tests
	result = result.replace(/\/\*\_\_BUILD\_COMMENT\_\_\*\*(.*?)\*\*(.*?)\*\//, function (_, condition, comment) {

		if (condition == "true") {

			return "/* " + comment + " */";

		} else if (condition == "false") {

			return "";

		} else {

			throw new Error();

		}

	});

	return result;

}

function stripES5(content) {
	return content
		.replace(/\/\*ES5\>\*\/[\s\S]+?\/\*\<ES5\*\//g, '')
		.replace(/\/\*ES6\>([\s\S]+?)\<ES6\*\//g, function (_, inner_content) {
			return inner_content;
		});
}

function createBrowserPackage(wrapper_content_parts) {

	// caveat: we can not use String.replace here, as replacement string contains special sequences like $'
	// which produce quite unexpected results, so we need to either escape them, or avoid completely,
	// or use a function as second replace() argument
	var content = wrapper_content_parts[0]
		+ browser_files['ERROR_DESCRIPTIONS.js']
		+ browser_files['ClassManager.js']
		+ wrapper_content_parts[1];

	content = replaceConstants(content, constants);

	//fs.writeFileSync(path, content);
	return content;
}

function createNodePackage(build_name, is_es6) {

	for (name in files) {

		var content = replaceConstants(files[name], constants);
		if (is_es6)
			content = stripES5(content);
		fs.writeFileSync('./../builds/' + build_name + '/' + name, content);

	}

}

createNodePackage('es5', false);
createNodePackage('es6', true);

fs.writeFileSync(
	'./../builds/browser/class-manager.debug.js',
	createBrowserPackage(wrapper_parts)
);

fs.writeFileSync(
	'./../builds/class-manager.raw.js',
	createBrowserPackage(wrapper_raw_content_parts)
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Replace references to MEMBER_TYPES.* and TYPES.* objects in 'ClassManager.js' with numbers

function replaceEnums(content) {

	var MEMBER_TYPES = context.MEMBER_TYPES;
	var member_types_replace_regex = new RegExp("(MEMBER_TYPES\\." + Object.keys(MEMBER_TYPES).join("|MEMBER_TYPES\\.") + ")", "g");
	content = content.replace(member_types_replace_regex, function (_, expression) {
		var key = expression.split('.')[1];
		return MEMBER_TYPES[key];
	});

	var TYPES = context.TYPES;
	var types_replace_regex = new RegExp("(TYPES\\." + Object.keys(TYPES).join("|TYPES\\.") + ")", "g");
	content = content.replace(types_replace_regex, function (_, expression) {
		var key = expression.split('.')[1];
		return TYPES[key];
	});

	return content;

}

browser_files['ClassManager.js'] = replaceEnums(browser_files['ClassManager.js']);
files['ClassManager.js'] = replaceEnums(files['ClassManager.js']);

//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

constants.__CM_INCLUDE_ERROR_DESCRIPTIONS__ = false;
var min_package = createBrowserPackage(wrapper_parts);

constants.__CM_ENABLE_SAFE_MODE__ = false;
var ultra_package = createBrowserPackage(wrapper_parts);

// @todo clean directories before doing something + clean _tmp dir after done.

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// minify browser versions

var UglifyJS = require('uglify-js');
var uglify_options = {
	mangle: true,
	compress: {
		// @todo choose better options?
		dead_code: true,
		unsafe: true,
		unused: true
	}
};
// @todo map
var compress_result = UglifyJS.minify({
	"class-manager-package-min.js": min_package
}, uglify_options);
fs.writeFileSync("./../builds/browser/class-manager.min.js", compress_result.code);

compress_result = UglifyJS.minify({
	"class-manager-package-ultra.js": ultra_package
}, uglify_options);
fs.writeFileSync("./../builds/browser/class-manager.ultra.js", compress_result.code);

//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////