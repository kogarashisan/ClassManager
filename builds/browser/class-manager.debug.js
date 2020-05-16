/*!
 * https://github.com/kogarashisan/ClassManager/
 */
(function(_global) {


// The reason this is in separate file is that error descriptions are also a part of this library's site on GitHub.

var ERROR_DESCRIPTIONS = null;

/* istanbul ignore else  */
if (true) {

	ERROR_DESCRIPTIONS = {
		1:   "Invalid argument",
		5:   "Duplicate name in inheritance chain: {1}. Class can not extend or implement other classes with same name.",
		7:   "'Merged': property is not array: {1}",
		8:   "'Shared' members of different types must not override each other (e.g. array must not become an object or something else). Except: null may become anything, and primitive type may become null.",
		9:   "Malformed directive or bad directive value: '{1}'",
		10:  "Implements: Classes with `_afterInit` hook can not be used as mixin: {1}",
		11:  "'Extend': a method from parent must not become something else in child: {2}@[1}",
		12:  "Conflict, function already exists in child: {1}",
		13:  "Forced code style restriction: undefined class members are not allowed. Please, replace undefined member values with null: {1}",
		14:  "Unsupported property type in source object: {1}",
		17:  "'Shared' member is not in class: {1}",
		18:  "Property of this type can not be made 'Shared': {1}",
		19:  "Instance member from parent class must not become 'Shared' ('Merged') in descendant: {1}",
		20:  "Member is already 'Shared' ('Merged') in parent class: {2}@{1}. Please, remove it from 'Shared' ('Merged') in descendant.",
		21:  "'Shared' class member is hidden by member from instance: {2}@{1}. Tip: this may happen when Shared member is also present in Implemented class (where it's not Shared)",
		22:  "Implements: classes with 'Shared' can not be used as mixin. {1}",
		23:  "Implements: class already implements {1}",
		24:  "_afterInit is not a function. If _afterInit is defined - then it must be a function.",
		27:  "define: invalid class name: {1}",
		28:  "Implements: class at index {1} is not valid",
	};

}



var ClassManager,
	ALLOWED_CLASS_NAME_REGEX = /^[a-zA-Z\_][a-zA-Z0-9\_]*$/,
	/**
	 * Strings, that don't need to be quoted
	 */
	SAFE_PROPERTY_NAME_REGEX = /^[a-zA-Z\_\$][a-zA-Z0-9\_\$]*$/,
	/**
	 * Known member types
	 * @enum {number}
	 */
	TYPES = {
		BOOLEAN: 0,
		NUMBER: 1,
		STRING: 2,
		FUNCTION: 3,
		ARRAY: 4,
		DATE: 5,
		REGEXP: 6,
		OBJECT: 7,
		ERROR: 8,
		NULL: 9,
		UNDEFINED: 10
	},
	/**
	 * Member type IDs in skeleton
	 * @enum {number}
	 */
	MEMBER_TYPES = {
		FUNCTION: 0,
		PRIMITIVE: 1,
		OBJECT: 2,
		STRING: 3,
		REGEXP: 4,
		EMPTY_ARRAY: 5,
		INLINE_ARRAY: 6,
		SLICE_ARRAY: 7
	},
	/**
	 * Special directives, understandable by ClassManager
	 * @type {Array.<string>}
	 */
	RESERVED_MEMBERS = ['Extends', 'Implements', 'Class', 'Shared', 'Merged', 'Prepare'],
	/**
	 * Types, which are allowed to be 'Shared'.
	 * Number means their logical group (primitive, array, object...).
	 * Group is used to check whether one shared type may override another
	 * @type {Object.<string, number>}
	 */
	ALLOWED_SHARED_TYPES_GROUP = {
		0/*boolean*/: 0,
		1/*number*/: 0,
		2/*string*/: 0,
		9/*null*/: 1,
		4/*array*/: 2,
		7/*object*/: 3
	},
	/**
	 * If an array consists of these types - it can be inlined
	 * @type {Array.<string>}
	 */
	SIMPLE_TYPES = [TYPES.STRING, TYPES.BOOLEAN, TYPES.NUMBER, TYPES.NULL, TYPES.UNDEFINED],
	/**
	 * Used by {@link getType}
	 * @type {Object.<string, TYPES>}
	 */
	DESCRIPTOR_TO_TYPE = {
		"[object Boolean]": TYPES.BOOLEAN,
		"[object Number]": TYPES.NUMBER,
		"[object String]": TYPES.STRING,
		"[object Function]": TYPES.FUNCTION,
		"[object Array]": TYPES.ARRAY,
		"[object Date]": TYPES.DATE,
		"[object RegExp]": TYPES.REGEXP,
		"[object Object]": TYPES.OBJECT,
		"[object Error]": TYPES.ERROR,
		"[object Null]": TYPES.NULL,
		"[object Undefined]": TYPES.UNDEFINED
	},
	// taken from json2
	/**
	 * Special characters, which must be escaped when serializing (quoting) a string
	 */
	QUOTE_ESCAPE_REGEX = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
	/**
	 * Map for escaping special characters
	 * @type {Object.<string, string>}
	 */
	quote_escape_map = {
		// without these comments JSDoc throws errors
		// https://github.com/jsdoc3/jsdoc/issues/549
		'\b': '\\b',
		/** @alias _1
		 * @ignore */
		'\t': '\\t',
		/** @alias _2
		 * @ignore */
		'\n': '\\n',
		/** @alias _3
		 * @ignore */
		'\f': '\\f',
		/** @alias _4
		 * @ignore */
		'\r': '\\r',
		'"' : '\\"',
		'\\': '\\\\'
	},
	/**
	 * Global unique class id, which is given to every constructor, built with `define`
	 * @type {number}
	 */
	uid = 0;

/**
 * Copy all properties from `partial` to `base`
 * @param {Object} base
 * @param {Object} partial
 */
function extend(base, partial) {

	for (var name in partial) {

		base[name] = partial[name];

	}

}
/**
 * Shallow copy of an object (not a clone)
 * @param {Object} object
 * @returns {Object}
 */
function copy(object) {

	var result = {};
	extend(result, object);
	return result;

}

/**
 * Throw an error (pure function).
 * This method may be shared among different projects for better compression.
 *
 * @param {string} version
 * @param {arguments} args
 * @param {Object} error_descriptions
 * @param {string} url
 * @param {string} [prefix]
 */
function _t(version, args, error_descriptions, url, prefix) {

	var message = args[0],
		encoded_args;

	if (typeof(message) == 'number') {
		/* istanbul ignore else */
		if (error_descriptions && error_descriptions[message]) {
			message = error_descriptions[message];
			message = message.replace(/\{(\d+)\}/g, function(_, index) {
				return args[+index];
			})
		} else {
			encoded_args = [];
			for (var i = 0, count = args.length; i < count; i++) {
				encoded_args.push(encodeURIComponent(args[i] + ''));
			}
			message = url + "#v=" + version + "&x=" + encoded_args.join(',');
		}
	}

	throw new Error((prefix || '') + (message || 'Debug assertion failed'));

}

/**
 * Throw an error
 * @param {(string|number)} [message] Defaults to <str>"Debug assertion failed"</str>
 */
function t(message) {

	_t(
		"2.0.0",
		Array.prototype.slice.call(arguments),
		/* istanbul ignore next */ true ? ERROR_DESCRIPTIONS : null,
		"https://_todo_/error_decoder.html",
		"[ClassManager error] "
	);

}

// @todo заменить на JSON.stringify
/**
 * Serialize a string into it's JavaScript representation. If you eval() the result - you will get the original value
 * @param {string} string
 * @returns {string}
 */
function quote(string) {

	var result;

	if (QUOTE_ESCAPE_REGEX.test(string)) {
		result = '"' + string.replace(QUOTE_ESCAPE_REGEX, function(a) {
				var c = quote_escape_map[a];
				return typeof c == 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
			}) + '"';
	} else {
		result = '"' + string + '"';
	}

	return result;

}
/**
 * Get enumerated type of any JavaScript value
 * @param {*} value Any value
 * @returns {TYPES}
 */
function getType(value) {

	// DESCRIPTOR_TO_TYPE.toString refers to plain object's toString
	return DESCRIPTOR_TO_TYPE[DESCRIPTOR_TO_TYPE.toString.call(value)];

}
/**
 * Include all unique values from `source_array` into `dest_array`
 * @param {Array} dest_array
 * @param {Array} source_array
 */
function includeUnique(dest_array, source_array) {

	var i = 0,
		count = source_array.length;

	for (; i < count; i++) {
		if (dest_array.indexOf(source_array[i]) == -1) {
			dest_array.push(source_array[i]);
		}
	}

}
/**
 * Whether to inline or slice() an array in constructor
 * @param {Array} items
 * @returns {boolean}
 */
function isInlineArray(items) {

	var i = 0,
		count = items.length,
		result = true;

	if (count > 10) {

		result = false;

	} else {

		for (; i < count; i++) {

			if (SIMPLE_TYPES.indexOf(getType(items[i])) == -1) {
				result = false;
				break;
			}

		}

	}

	return result;

}
/**
 * Serialize an array which contains only certain primitive types from `SIMPLE_TYPES`
 *
 * @param {Array} data
 * @returns {string}
 */
function serializeInlineArray(data) {

	var tempResult = [],
		i = 0,
		count = data.length,
		type,
		value;

	for (; i < count; i++) {

		type = getType(data[i]);
		switch (type) {
			case TYPES.STRING:
				value = quote(data[i]);
				break;
			case TYPES.NULL:
			case TYPES.UNDEFINED:
			case TYPES.BOOLEAN:
			case TYPES.NUMBER:
				value = data[i] + '';
				break;
			default:
				t();
		}
		tempResult.push(value);

	}

	return '[' + tempResult.join(", ") + ']';

}
/**
 * Recursively create skeletons for all objects inside class body
 * @param {_tClassData} class_data
 * @param {Object} class_body
 * @param {boolean} is_root
 * @returns {Object}
 */
function disassemble(class_data, class_body, is_root) {

	var name,
		skeleton = {},
		value,
		type,
		skeleton_value;

	for (name in class_body) {

		if (is_root && (RESERVED_MEMBERS.indexOf(name) != -1 || (name in class_data.Shared))) {

			continue;

		}

		value = class_body[name];
		type = getType(value);

		switch (type) {
			case TYPES.NULL:
			case TYPES.BOOLEAN:
			case TYPES.NUMBER:
				skeleton_value = {t: MEMBER_TYPES.PRIMITIVE, v: value};
				break;
			case TYPES.STRING:
				skeleton_value = {t: MEMBER_TYPES.STRING, v: value};
				break;
			case TYPES.FUNCTION:
				skeleton_value = {t: MEMBER_TYPES.FUNCTION, i: class_data.references.length};
				class_data.references.push(value);
				break;
			case TYPES.REGEXP:
				skeleton_value = {t: MEMBER_TYPES.REGEXP, i: class_data.references.length};
				class_data.references.push(value);
				break;
			case TYPES.OBJECT:
				skeleton_value = {
					t: MEMBER_TYPES.OBJECT,
					skeleton: disassemble(class_data, value, false)
				};
				break;
			case TYPES.ARRAY:
				if (value.length == 0) {
					skeleton_value = {t: MEMBER_TYPES.EMPTY_ARRAY};
				} else if (true && isInlineArray(value)) {
					skeleton_value = {t: MEMBER_TYPES.INLINE_ARRAY, v: value};
				} else {
					skeleton_value = {t: MEMBER_TYPES.SLICE_ARRAY, i: class_data.references.length};
					class_data.references.push(value);
				}
				break;
			case TYPES.UNDEFINED:
				true && t(13, name);
				break;
			default:
				true && t(14, type);
				break;
		}

		skeleton[name] = skeleton_value;

	}

	return skeleton;

}
/**
 * Perform class serialization
 * @param {Object} skeleton
 * @param {_tClassData} class_data
 * @param {string} padding
 * @param {Array} serialized_properties
 * @returns {boolean} <kw>true</kw>, if object uses {@link _tClassData#references}
 */
function serializeSkeleton(skeleton, class_data, padding, serialized_properties) {

	var name,
		serialized_value,
		uses_references = false,
		object_properties;

	for (name in skeleton) {

		switch (skeleton[name].t) {
			case MEMBER_TYPES.STRING:
				serialized_value = quote(skeleton[name].v);
				break;
			case MEMBER_TYPES.PRIMITIVE: // null, boolean, number
				serialized_value = skeleton[name].v + '';
				break;
			case MEMBER_TYPES.REGEXP:
			case MEMBER_TYPES.FUNCTION:
				serialized_value = 'r[' + skeleton[name].i + ']';
				uses_references = true;
				break;
			case MEMBER_TYPES.EMPTY_ARRAY:
				serialized_value = "[]";
				break;
			case MEMBER_TYPES.INLINE_ARRAY:
				serialized_value = serializeInlineArray(skeleton[name].v);
				break;
			case MEMBER_TYPES.SLICE_ARRAY:
				serialized_value = 'r[' + skeleton[name].i + '].slice()';
				uses_references = true;
				break;
			case MEMBER_TYPES.OBJECT:
				object_properties = [];
				if (serializeSkeleton(skeleton[name].skeleton, class_data, padding + "\t", object_properties)) {
					uses_references = true;
				}
				serialized_value = object_properties.length
					? "{\n\t" + padding + object_properties.join(",\n\t" + padding) + "\n" + padding + "}" : "{}";
				break;
			/* istanbul ignore next */
			default:
				true && t();
		}

		if (SAFE_PROPERTY_NAME_REGEX.test(name)) {

			// quotes are needed for old browsers: they do not support
			// reserved language words as property names.
			// for example, this will fail in old Opera: {try: 1}
			serialized_properties.push('"' + name + '": ' + serialized_value)

		} else {

			serialized_properties.push(quote(name) + ': ' + serialized_value);

		}

	}

	return uses_references;

}
/**
 * Build class constructor that can be used with the <kw>new</kw> keyword
 * @param {_tClassData} class_data
 * @returns {function} The class constructor
 */
function buildRealConstructor(class_data) {

	var prototype = {},
		skeleton = class_data.skeleton,
		serialized_value,
		constructor_actions = [],
		name,
		source,
		constructor,
		object_properties,
		uses_references = false;

	for (name in skeleton) {

		switch (skeleton[name].t) {
			case MEMBER_TYPES.STRING:
				serialized_value = quote(skeleton[name].v);
				break;
			case MEMBER_TYPES.PRIMITIVE: // null, boolean, number
				serialized_value = skeleton[name].v + '';
				break;
			case MEMBER_TYPES.EMPTY_ARRAY:
				serialized_value = "[]";
				break;
			case MEMBER_TYPES.INLINE_ARRAY:
				serialized_value = serializeInlineArray(skeleton[name].v);
				break;
			case MEMBER_TYPES.REGEXP:
			case MEMBER_TYPES.FUNCTION:
				prototype[name] = class_data.references[skeleton[name].i];
				break;
			case MEMBER_TYPES.SLICE_ARRAY:
				serialized_value = 'r[' + skeleton[name].i + '].slice()';
				uses_references = true;
				break;
			case MEMBER_TYPES.OBJECT:
				object_properties = [];
				if (serializeSkeleton(skeleton[name].skeleton, class_data, "\t", object_properties)) {
					uses_references = true;
				}
				serialized_value = object_properties.length
					? "{\n\t" + object_properties.join(",\n\t") + "\n}"
					: "{}";
				break;
			/* istanbul ignore next */
			default:
				true && t();
		}

		if (serialized_value) {

			if (SAFE_PROPERTY_NAME_REGEX.test(name)) {

				constructor_actions.push('this.' + name + ' = ' + serialized_value);

			} else {

				constructor_actions.push('this[' + quote(name) + '] = ' + serialized_value);

			}

			serialized_value = null;

		}

	}

	extend(prototype, class_data.Shared);
	prototype.Class = class_data;

	if (true) {
		source = 'if (!this.Class) throw new Error("Class constructor was called without `new` operator.");'
	}

	source += (uses_references ? ("var r=this.Class.references;\n") : '')
		+ constructor_actions.join(";\n")
		+ ";";

	if (class_data.skeleton.init) {

		source += "\nthis.init.apply(this, arguments);";

	}

	if (class_data.skeleton._afterInit) {

		if (true && class_data.skeleton._afterInit.t != MEMBER_TYPES.FUNCTION) t(24);
		source += "\nthis._afterInit();";

	}

	constructor = new Function(source);
	// for Chrome we could assign prototype object directly,
	// but in Firefox this will result in performance degradation
	extend(constructor.prototype, prototype);
	return constructor;

}
/**
 * Perform extend/implement operation
 * @param {_tClassData} child_data
 * @param {Object} child_skeleton The skeleton of a child object
 * @param {_tClassData} parent_data
 * @param {Object} parent_skeleton The skeleton of a parent object
 * @param {boolean} is_root <kw>true</kw>, when extending skeletons class bodies, and <kw>false</kw> in all other cases
 * @param {number} [references_offset] Also acts as a sign of 'implements' mode
 */
function extendClass(child_data, child_skeleton, parent_data, parent_skeleton, is_root, references_offset) {

	var parent_descriptor,
		name,
		new_name,
		parent_type;

	for (name in parent_skeleton) {

		parent_descriptor = parent_skeleton[name];
		parent_type = parent_descriptor.t;

		if (name in child_skeleton) {

			if (true && is_root && (child_skeleton[name].t == MEMBER_TYPES.FUNCTION ^ parent_type == MEMBER_TYPES.FUNCTION)) {
				// Allow null properties from parent to become class methods in child
				if (
					child_skeleton[name].t != MEMBER_TYPES.FUNCTION
					|| parent_type != MEMBER_TYPES.PRIMITIVE
					|| parent_descriptor.v != null
				) {
					t(11, child_data.name, name);
				}
			}

			if (parent_type == MEMBER_TYPES.FUNCTION) {

				if (!is_root || typeof(references_offset) != 'undefined') continue;

				new_name = parent_data.name + '$' + name;
				if (true && (new_name in child_skeleton)) t(12, new_name);
				child_skeleton[new_name] = parent_descriptor;

			} else if (parent_type == MEMBER_TYPES.OBJECT) {

				extendClass(child_data, child_skeleton[name].skeleton, parent_data, parent_descriptor.skeleton, false, references_offset);

			}

		} else if (parent_type == MEMBER_TYPES.OBJECT) {

			child_skeleton[name] = {t: MEMBER_TYPES.OBJECT, skeleton: {}};
			extendClass(child_data, child_skeleton[name].skeleton, parent_data, parent_descriptor.skeleton, false, references_offset);

		} else if (
			// There is no bug here (no need for typeof checking):
			// if class has no references on it's own - then references_offset will be zero,
			// and this branch becomes equivalent of the 'else' branch
			references_offset &&
			(
				parent_type == MEMBER_TYPES.FUNCTION
				|| parent_type == MEMBER_TYPES.SLICE_ARRAY
				|| parent_type == MEMBER_TYPES.REGEXP
			)
		) {

			child_skeleton[name] = {t: parent_type, i: parent_descriptor.i + references_offset};

		} else {

			child_skeleton[name] = parent_descriptor;

		}

	}

}
/**
 * Implement members from another class into current class data
 * @param {_tClassData} class_data Class, which will be extended
 * @param {_tClassData} what Class, which will be merged into `class_data`
 */
function implement(class_data, what) {

	var name,
		references_offset;

	if (true) {
		for (name in what.Shared) t(22, what.name);
		if (class_data.includes_names.indexOf(what.name) != -1) t(23, what.name);
		// no need to test for includes_cdata, as if names are unique - classes are also unique
		if (what.skeleton._afterInit) t(10, what.name);
	}

	class_data.includes_names.push(what.name);
	class_data.includes_cdata = class_data.includes_cdata.concat(what, what.includes_cdata);
	references_offset = class_data.references.length;
	// array copy is inexpensive, cause it contains only reference types
	class_data.references = class_data.references.concat(what.references);

	extendClass(class_data, class_data.skeleton, what, what.skeleton, true, references_offset);

}

/**
 * Temporary structure with class internals
 */
function _tClassData(class_name, class_body) {

	/**
	 * Name of the class
	 * @type {string}
	 */
	this.name = class_name;
	/**
	 * Raw class body, from which it was constructed
	 * @type {Object}
	 */
	this.class_body = class_body;
	/**
	 * Parent class descriptor
	 * @type {_tClassData}
	 */
	this.parent_cdata = null;
	/**
	 * List of class names, which this one extends or implements,
	 * including name of current class
	 * @type {Array.<string>}
	 */
	this.includes_names = [class_name];
	/**
	 * Descriptors of extended and implemented classes
	 * @type {Array.<_tClassData>}
	 */
	this.includes_cdata = [];
	/**
	 * Data, used for inheritance and constructor building
	 * @type {Object.<string, _cSkeletonMember>}
	 */
	this.skeleton = null;
	/**
	 * For each function (and sometimes array) reference in skeleton - holds the actual data
	 * @type {Array}
	 */
	this.references = [];
	/**
	 * Holds shared objects
	 * @type {Object}
	 */
	this.Shared = {};
	/**
	 * Names of arrays from `Merged` directive
	 * @type {Array.<string>}
	 */
	this.Merged = [];
	/**
	 * If true - than the class will be created with dummy constructor, that throws exception
	 * (so you can not create an instance of this class).
	 *
	 * This option is not inherited from parents: if you want to make a child abstract
	 * - you must explicitly declare it as abstract in body's Class property
	 * @type {boolean}
	 */
	this.is_abstract = false;
	/**
	 * List of methods from `Prepare` directive
	 * @type {Array.<function>}
	 */
	this.body_processors = null;
	/**
	 * To protect from situation, when there are two ClassManagers with different versions in project.
	 * This may cause hard-to-find bugs, as different versions are not compatible
	 */
	this.class_manager = ClassManager;
	/**
	 * Unique class id. May be used by external code to store class metadata
	 * @type {number}
	 */
	this.uid = uid++;

}

/**
 * Create and manage classes
 */
ClassManager = {
	SAFE_PROPERTY_NAME_REGEX: SAFE_PROPERTY_NAME_REGEX,
	quote: quote,
	/**
	 * Create a class
	 * @param {string} class_name Full name of the class
	 * @param {Object} class_body Class body
	 * @returns {function}
	 */
	define: function(class_name, class_body) {

		if (true && !ALLOWED_CLASS_NAME_REGEX.test(class_name)) t(27, class_name);

		var class_data = new _tClassData(class_name, class_body),
			name,
			parent_data,
			i,
			count,
			shared_names,
			type,
			parent_group,
			child_group,
			_extends,
			_implements,
			constructor;

		if ('Class' in class_body) {
			var class_options = class_body.Class;
			if (true && !class_options) t(9, 'Class');
			if (class_options.is_abstract) class_data.is_abstract = true;
		}

		if ('Prepare' in class_body) {
			if (true && typeof class_body.Prepare != 'function') t(9, 'Prepare');
			class_data.body_processors = [class_body.Prepare];
			class_body.Prepare();
		}

		if ('Extends' in class_body) {

			_extends = class_body.Extends;
			if (true && !this.isValidClass(_extends)) t(9, 'Extends');
			parent_data = /** @type {_tClassData} */ _extends.prototype.Class;
			class_data.parent_cdata = parent_data;

			if (true && parent_data.includes_names.indexOf(class_name) != -1) t(5, class_name);

			class_data.includes_names = parent_data.includes_names.concat(class_name);
			class_data.includes_cdata = parent_data.includes_cdata.concat(parent_data);
			class_data.references = parent_data.references.slice();
			class_data.Merged = parent_data.Merged.slice();

			if (parent_data.body_processors) {
				for (i = parent_data.body_processors.length - 1; i >= 0; i--) {
					parent_data.body_processors[i].call(class_body);
				}
				class_data.body_processors = parent_data.body_processors.concat(class_data.body_processors);
			}

			for (name in parent_data.Shared) {

				parent_group = ALLOWED_SHARED_TYPES_GROUP[getType(parent_data.Shared[name])];

				if (name in class_body) {

					child_group = ALLOWED_SHARED_TYPES_GROUP[getType(class_body[name])];
					if (true && parent_group != 1 /*null*/) { // null in parent can be replaced with anything
						// primitive type may become null
						if (parent_group != child_group && (parent_group != 0 /*primitive*/ || child_group != 1 /*null*/)) t(8);
					}

					if (parent_group == 1) { // null

						// nulls in parent are just replaced with new value, whatever it is
						class_data.Shared[name] = class_body[name];

					} else if (child_group == 3) { // object

						class_data.Shared[name] = copy(parent_data.Shared[name]);
						extend(class_data.Shared[name], class_body[name]);

					} else { // arrays and primitives

						// @todo запретить заменять примитивы. String на Number
						class_data.Shared[name] = (class_data.Merged.indexOf(name) != -1)
							? parent_data.Shared[name].concat(class_body[name]) // if it's Merged, then it's definitely an array
							: class_body[name];

					}

				} else {

					class_data.Shared[name] = parent_data.Shared[name];

				}

			}

		}

		if (('Shared' in class_body) || ('Merged' in class_body)) {

			if ('Shared' in class_body) {

				if (true && !Array.isArray(class_body.Shared)) t(9, 'Shared');
				shared_names = class_body.Shared.slice();

			} else {

				shared_names = [];

			}

			if ('Merged' in class_body) {

				if (true) {
					if (!Array.isArray(class_body.Merged)) t(9, 'Merged');
					for (i = 0, count = class_body.Merged.length; i < count; i++) {
						name = class_body.Merged[i];
						if (getType(class_body[name]) != TYPES.ARRAY) t(7, name);
					}
				}

				// @todo запретить дубликаты имен
				class_data.Merged = class_data.Merged.concat(class_body.Merged);
				includeUnique(shared_names, class_body.Merged);

			}

			for (i = 0, count = shared_names.length; i < count; i++) {

				name = shared_names[i];
				type = getType(class_body[name]);

				if (true) {
					if (!(name in class_body)) t(17, name);
					if (!(type in ALLOWED_SHARED_TYPES_GROUP)) t(18, name);
					if (class_data.parent_cdata && (name in class_data.parent_cdata.skeleton)) t(19, name);
					if (name in class_data.Shared) t(20, class_name, name);
				}

				class_data.Shared[name] = class_body[name];

			}

		}

		class_data.skeleton = disassemble(class_data, class_body, true);

		if (parent_data) {

			extendClass(class_data, class_data.skeleton, parent_data, parent_data.skeleton, true);

		}

		if ('Implements' in class_body) {

			_implements = class_body.Implements;
			if (true && !Array.isArray(_implements)) t(9, 'Implements');
			for (i = 0, count = _implements.length; i < count; i++) {

				if (true && !this.isValidClass(_implements[i])) t(28, i);
				implement(class_data, _implements[i].prototype.Class);

			}

		}

        if (true) {
            for (name in class_data.Shared) {
                if (name in class_data.skeleton) t(21, class_data.name, name);
            }
        }

        if (class_data.is_abstract) {

			constructor = function() {
				throw new Error("Trying to create an instance of abstract class: " + class_data.name);
			};
			constructor.prototype.Class = class_data;

		} else {

			constructor = buildRealConstructor(class_data);

		}

		return constructor;

	},
	/**
	 * Does given class instance extend or implement `class_name`
	 * @param {Object} instance
	 * @param {function} constructor
	 * @returns {boolean}
	 */
	instanceOf: function(instance, constructor) {

		if (true && !this.isValidClass(constructor)) t();

		var result = false,
			Class,
			parent_cdata = constructor.prototype.Class;

		if (instance) {

			Class = instance.Class;
			result = Class
				&& !instance.hasOwnProperty('Class') // security check to protect from fake classes
				&& (Class == parent_cdata || Class.includes_cdata.indexOf(parent_cdata) != -1);

		}

		return result;

	},
	/**
	 * Tell, if argument is a class, which was created with `define`
	 * @param {function} constructor
	 * @returns {boolean}
	 */
	isValidClass: function(constructor) {

		return typeof(constructor) == 'function'
			&& constructor.prototype.Class
			// class instance MUST be created with THIS ClassManager, not another one!
			// (cause different versions are not compatible)
			&& constructor.prototype.Class.class_manager == ClassManager;

	},
	// @todo комментарий
	_t: _t,
	e: extend,
	c: copy,
};



if (typeof module != 'undefined' && module.exports) {

	module.exports = ClassManager;

} else {

	_global.ClassManager = ClassManager;

}

}(this));