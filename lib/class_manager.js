(function (_global) {

var Firestorm = {
	extend: function (base, partial) {

		for (var name in partial) {

			base[name] = partial[name];

		}

	},
	implement: function (base, partial) {

		for (var name in partial) {

			if (!(name in base)) {

				base[name] = partial[name];

			}

		}

	},
	_descriptor_to_type: {
		"[object Boolean]": "boolean",
		"[object Number]": "number",
		"[object String]": "string",
		"[object Function]": "function",
		"[object Array]": "array",
		"[object Date]": "date",
		"[object RegExp]": "regexp",
		"[object Object]": "object",
		"[object Error]": "error",
		"[object Null]": "null",
		"[object Undefined]": "undefined"
	},
	getType: function (value) {

		var result = 'null';

		// note: Regexp type may be both an object and a function in different browsers
		if (value !== null) {

			result = typeof(value);
			if (result == "object" || result == "function") {
				// this.toString refers to plain object's toString
				result = this._descriptor_to_type[this.toString.call(value)] || "object";
			}

		}

		return result;

	},
	String: {
		quote_escape_map: {
			"\b": "\\b",
			"\t": "\\t",
			"\n": "\\n",
			"\f": "\\f",
			"\r": "\\r",
			"\"": "\\\"",
			"\\": "\\\\"
		},
		QUOTE_ESCAPE_REGEX: /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		quote: function (string) {

		var result,
			map = this.quote_escape_map;

		if (this.QUOTE_ESCAPE_REGEX.test(string)) {
			result = '"' + string.replace(this.QUOTE_ESCAPE_REGEX, function (a) {
				var c = map[a];
				return typeof c == 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
			}) + '"';
		} else {
			result = '"' + string + '"';
		}

		return result;

	}
	},
	Object: {
		copy: function (object) {

		var result = {};
		Firestorm.extend(result, object);
		return result;

	},
		isEmpty: function (object_instance) {
		// it's much faster than using Object.keys
		//noinspection LoopStatementThatDoesntLoopJS
		for (var name in object_instance) {
			return false;
		}
		return true;
	}
	}
};

var Lava = {
	schema: {DEBUG: true},
	t: function (message) {

		if (typeof(message) == 'number' && this.KNOWN_EXCEPTIONS && (message in this.KNOWN_EXCEPTIONS)) {
			throw new Error(this.KNOWN_EXCEPTIONS[message]);
		}

		throw new Error(message || 'Debug assertion failed');

	},
	VALID_PROPERTY_NAME_REGEX: /^[a-zA-Z\_\$][a-zA-Z0-9\_\$]*$/,
	JS_KEYWORDS: [
		"break",
		"case",
		"catch",
		"class",
		"const",
		"continue",
		"debugger",
		"default",
		"delete",
		"do",
		"else",
		"export",
		"extends",
		"false",
		"finally",
		"for",
		"function",
		"if",
		"import",
		"in",
		"instanceof",
		"new",
		"null",
		"protected",
		"return",
		"super",
		"switch",
		"this",
		"throw",
		"true",
		"try",
		"typeof",
		"var",
		"while",
		"with",
		"abstract",
		"boolean",
		"byte",
		"char",
		"decimal",
		"double",
		"enum",
		"final",
		"float",
		"get",
		"implements",
		"int",
		"interface",
		"internal",
		"long",
		"package",
		"private",
		"protected",
		"public",
		"sbyte",
		"set",
		"short",
		"static",
		"uint",
		"ulong",
		"ushort",
		"void",
		"assert",
		"ensure",
		"event",
		"goto",
		"invariant",
		"namespace",
		"native",
		"require",
		"synchronized",
		"throws",
		"transient",
		"use",
		"volatile"
	],
	ClassManager: null,
	instanceOf: function (instance, class_name) {

		return instance.Class.hierarchy_paths.indexOf(class_name) != -1 || instance.Class.implements.indexOf(class_name) != -1;

	}
};
/**
 * Create and manage classes
 */
Lava.ClassManager = {

	/**
	 * Whether to serialize them and inline as a value, when building constructor,
	 * or slice() from original array in original object
	 * @type {boolean}
	 * @const
	 */
	INLINE_SIMPLE_ARRAYS: true,
	/**
	 * If an array consists of these types - it can be inlined
	 * @type {Array.<string>}
	 */
	SIMPLE_TYPES: ['string', 'boolean', 'number', 'null', 'undefined'],

	/**
	 * All data that belongs to each class: everything that's needed for inheritance and building of a constructor
	 * @type {Object.<string, _cClassData>}
	 */
	_sources: {},
	/**
	 * Constructors for each class
	 * @type {Object.<string, function>}
	 */
	constructors: {},
	/**
	 * Special directives, understandable by ClassManager
	 */
	_reserved_members: ['Extends', 'Implements', 'Class', 'Shared'],

	/**
	 * Namespaces, which can hold class constructors
	 * @type {Object.<string, Object>}
	 */
	_root: {},

	/**
	 * Add a namespace, that can contain class constructors
	 * @param {string} name The name of the namespace
	 * @param {Object} object The namespace object
	 */
	registerRootNamespace: function(name, object) {

		this._root[name] = object;

	},

	/**
	 * Get {@link _cClassData} structure for each class
	 * @param {string} class_path
	 * @returns {_cClassData}
	 */
	getClassData: function(class_path) {

		return this._sources[class_path];

	},

	/**
	 * Create a class
	 * @param {string} class_path Full name of the class
	 * @param {Object} source_object Class body
	 */
	define: function(class_path, source_object) {

		var name,
			class_data,
			parent_data,
			i,
			count,
			shared_names,
			is_array,
			type;

		class_data = /** @type {_cClassData} */ {
			name: class_path.split('.').pop(),
			path: class_path,
			source_object: source_object,
			"extends": null,
			"implements": [],
			parent_class_data: null,
			hierarchy_paths: null,
			hierarchy_names: null,
			skeleton: null,
			references: [],
			shared: {},
			constructor: null,
			own_references_count: 0
		};

		if ('Extends' in source_object) {

			if (Lava.schema.DEBUG && typeof(source_object.Extends) != 'string') Lava.t('Extends: string expected. ' + class_path);
			class_data['extends'] = /** @type {string} */ source_object.Extends;
			parent_data = this._sources[source_object.Extends];
			class_data.parent_class_data = parent_data;

			if (!parent_data) Lava.t('[define] Base class not found: "' + source_object.Extends + '"');
			if (!parent_data.skeleton) Lava.t("[define] Parent class was loaded without skeleton, extension is not possible: " + class_data['extends']);
			if (parent_data.hierarchy_names.indexOf(class_data.name) != -1) Lava.t("[define] Duplicate name in inheritance chain: " + class_data.name + " / " + class_path);

			class_data.hierarchy_paths = parent_data.hierarchy_paths.slice();
			class_data.hierarchy_paths.push(class_path);
			class_data.hierarchy_names = parent_data.hierarchy_names.slice();
			class_data.hierarchy_names.push(class_data.name);
			class_data.references = parent_data.references.slice();
			class_data.own_references_count -= parent_data.references.length;
			class_data.implements = parent_data.implements.slice();

			for (name in parent_data.shared) {

				is_array = Array.isArray(parent_data.shared[name]);
				class_data.shared[name] = is_array
					? parent_data.shared[name].slice()
					: Firestorm.Object.copy(parent_data.shared[name]);

				if (name in source_object) {

					if (Lava.schema.DEBUG && Array.isArray(source_object[name]) != is_array) Lava.t("Shared members of different types must not override each other (array must not become an object)");
					if (is_array) {
						class_data.shared[name] = source_object[name];
					} else {
						Firestorm.extend(class_data.shared[name], source_object[name]);
					}

				}

			}

		} else {

			class_data.hierarchy_paths = [class_path];
			class_data.hierarchy_names = [class_data.name];

		}

		if ('Shared' in source_object) {

			shared_names = (typeof(source_object.Shared) == 'string') ? [source_object.Shared] : source_object.Shared;

			for (i = 0, count = shared_names.length; i < count; i++) {

				name = shared_names[i];
				type = Firestorm.getType(source_object[name]);

				if (Lava.schema.DEBUG) {
					if (!(name in source_object)) Lava.t("Shared member is not in class: " + name);
					if (type != 'object' && type != 'array') Lava.t("Shared: class member must be an object or array");
					if (class_data.parent_class_data && (name in class_data.parent_class_data.skeleton)) Lava.t("[ClassManager] instance member from parent class may not become shared in descendant: " + name);
					if (name in class_data.shared) Lava.t("Member is already shared in parent class: " + class_path + "#" + name);
				}

				class_data.shared[name] = source_object[name];

			}

		}

		class_data.skeleton = this._disassemble(class_data, source_object, true);

		if (parent_data) {

			this._extend(class_data, class_data.skeleton, parent_data, parent_data.skeleton, true);

		}

		class_data.own_references_count += class_data.references.length;

		if ('Implements' in source_object) {

			if (typeof(source_object.Implements) == 'string') {

				this._implementPath(class_data, source_object.Implements);

			} else {

				for (i = 0, count = source_object.Implements.length; i < count; i++) {

					this._implementPath(class_data, source_object.Implements[i]);

				}

			}

		}

		class_data.constructor = this._buildRealConstructor(class_data);

		this._registerClass(class_data);

	},

	/**
	 * Implement members from another class into current class data
	 * @param {_cClassData} class_data
	 * @param {string} path
	 */
	_implementPath: function(class_data, path) {

		var implements_source = this._sources[path],
			name,
			references_offset;

		if (!implements_source) Lava.t('Implements: class not found - "' + path + '"');
		if (Lava.schema.DEBUG) {

			for (name in implements_source.shared) Lava.t("Implements: unable to use a class with Shared as mixin.");

		}

		if (Lava.schema.DEBUG && class_data.implements.indexOf(path) != -1) {

			Lava.t("Implements: class " + class_data.path + " already implements " + path);

		}

		class_data.implements.push(path);
		references_offset = class_data.references.length;
		// array copy is inexpensive, cause it contains only reference types
		class_data.references = class_data.references.concat(implements_source.references);

		this._extend(class_data, class_data.skeleton, implements_source, implements_source.skeleton, true, references_offset);

	},

	/**
	 * Perform extend/implement operation
	 * @param {_cClassData} child_data
	 * @param {Object} child_skeleton The skeleton of a child object
	 * @param {_cClassData} parent_data
	 * @param {Object} parent_skeleton The skeleton of a parent object
	 * @param {boolean} is_root <kw>true</kw>, when extending skeletons class bodies, and <kw>false</kw> in all other cases
	 * @param {number} [references_offset] Also acts as a sign of 'implements' mode
	 */
	_extend: function (child_data, child_skeleton, parent_data, parent_skeleton, is_root, references_offset) {

		var parent_descriptor,
			name,
			new_name;

		for (name in parent_skeleton) {

			parent_descriptor = parent_skeleton[name];

			if (name in child_skeleton) {

				if (is_root && (child_skeleton[name].type == 'function' ^ parent_descriptor.type == 'function')) {
					Lava.t('Extend: functions in class root are not replaceable with other types (' + name + ')');
				}

				if (parent_descriptor.type == 'function') {

					if (!is_root || typeof(references_offset) != 'undefined') continue;

					new_name = parent_data.name + '$' + name;
					if (new_name in child_skeleton) Lava.t('[ClassManager] Assertion failed, function already exists: ' + new_name);
					child_skeleton[new_name] = parent_descriptor;

				} else if (parent_descriptor.type == 'object') {

					this._extend(child_data, child_skeleton[name].skeleton, parent_data, parent_descriptor.skeleton, false, references_offset);

				}

			} else if (parent_descriptor.type == 'object') {

				child_skeleton[name] = {type: 'object', skeleton: {}};
				this._extend(child_data, child_skeleton[name].skeleton, parent_data, parent_descriptor.skeleton, false, references_offset);

			} else if (references_offset && (parent_descriptor.type == 'function' || parent_descriptor.type == 'sliceArray')) {

				child_skeleton[name] = {type: parent_descriptor.type, index: parent_descriptor.index + references_offset};

			} else {

				child_skeleton[name] = parent_descriptor;

			}

		}

	},

	/**
	 * Recursively create skeletons for all objects inside class body
	 * @param {_cClassData} class_data
	 * @param {Object} source_object
	 * @param {boolean} is_root
	 * @returns {Object}
	 */
	_disassemble: function(class_data, source_object, is_root) {

		var name,
			skeleton = {},
			value,
			type,
			skeleton_value;

		for (name in source_object) {

			if (is_root && (this._reserved_members.indexOf(name) != -1 || (name in class_data.shared))) {

				continue;

			}

			value = source_object[name];
			type = Firestorm.getType(value);

			switch (type) {
				case 'object':
					skeleton_value = {
						type: 'object',
						skeleton: this._disassemble(class_data, value, false)
					};
					break;
				case 'function':
					skeleton_value = {type: 'function', index: class_data.references.length};
					class_data.references.push(value);
					break;
				case 'array':
					if (value.length == 0) {
						skeleton_value = {type: 'inlineArray', is_empty: true};
					} else if (this.INLINE_SIMPLE_ARRAYS && this.isInlineArray(value)) {
						skeleton_value = {type: 'inlineArray', value: value};
					} else {
						skeleton_value = {type: 'sliceArray', index: class_data.references.length};
						class_data.references.push(value);
					}
					break;
				case 'null':
					skeleton_value = {type: 'null'};
					break;
				case 'undefined':
					skeleton_value = {type: 'undefined'};
					break;
				case 'boolean':
					skeleton_value = {type: 'boolean', value: value};
					break;
				case 'number':
					skeleton_value = {type: 'number', value: value};
					break;
				case 'string':
					skeleton_value = {type: 'string', value: value};
					break;
				case 'regexp':
					skeleton_value = {type: 'regexp', value: value};
					break;
				default:
					Lava.t("[Class system] Unsupported property type in source object: " + type);
					break;
			}

			skeleton[name] = skeleton_value;

		}

		return skeleton;

	},

	/**
	 * Build class constructor that can be used with the <kw>new</kw> keyword
	 * @param {_cClassData} class_data
	 * @returns {function} The class constructor
	 */
	_buildRealConstructor: function(class_data) {

		var prototype = {},
			skeleton = class_data.skeleton,
			serialized_action,
			constructor_actions = [],
			name,
			source,
			constructor,
			object_properties,
			uses_references = false;

		for (name in skeleton) {

			serialized_action = null;

			switch (skeleton[name].type) {
				// members that should be in prototype
				case 'string':
					prototype[name] = skeleton[name].value;
					break;
				case 'null':
					prototype[name] = null;
					break;
				case 'undefined':
					prototype[name] = void 0;
					break;
				case 'boolean':
					prototype[name] = skeleton[name].value;
					break;
				case 'number':
					prototype[name] = skeleton[name].value;
					break;
				case 'function':
					prototype[name] = class_data.references[skeleton[name].index];
					break;
				case 'regexp':
					prototype[name] = skeleton[name].value;
					break;
				// members that are copied as inline property
				case 'sliceArray':
					serialized_action = 'r[' + skeleton[name].index + '].slice()';
					uses_references = true;
					break;
				case 'inlineArray':
					serialized_action = skeleton[name].is_empty ? '[]' : this._serializeInlineArray(skeleton[name].value);
					break;
				case 'object':
					object_properties = [];
					if (this._serializeSkeleton(skeleton[name].skeleton, class_data, "\t", object_properties)) {
						uses_references = true;
					}
					serialized_action = object_properties.length
						? "{\n\t" + object_properties.join(",\n\t") + "\n}"
						: "{}";
					break;
				default:
					Lava.t("[_buildRealConstructor] unknown property descriptor type: " + skeleton[name].type);
			}

			if (serialized_action) {

				if (Lava.VALID_PROPERTY_NAME_REGEX.test(name)) {

					constructor_actions.push('this.' + name + ' = ' + serialized_action);

				} else {

					constructor_actions.push('this[' + Firestorm.String.quote(name) + '] = ' + serialized_action);

				}

			}

		}

		for (name in class_data.shared) {

			prototype[name] = class_data.shared[name];

		}

		prototype.Class = class_data;

		source = (uses_references ? ("var r=Lava.ClassManager.getClassData('" + class_data.path + "').references;\n") : '')
			+ constructor_actions.join(";\n")
			+ ";";

		if (class_data.skeleton.init) {

			source += "\nthis.init.apply(this, arguments);";

		}

		constructor = new Function(source);
		// for Chrome we could assign prototype object directly,
		// but in Firefox this will result in performance degradation
		Firestorm.extend(constructor.prototype, prototype);
		return constructor;

	},

	/**
	 * Perform special class serialization, that takes functions and resources from class data and can be used in constructors
	 * @param {Object} skeleton
	 * @param {_cClassData} class_data
	 * @param {string} padding
	 * @param {Array} serialized_properties
	 * @returns {boolean} <kw>true</kw>, if object uses {@link _cClassData#references}
	 */
	_serializeSkeleton: function(skeleton, class_data, padding, serialized_properties) {

		var name,
			serialized_value,
			uses_references = false,
			object_properties;

		for (name in skeleton) {

			switch (skeleton[name].type) {
				case 'string':
					serialized_value = '"' + skeleton[name].value.replace(/\"/g, "\\\"") + '"';
					break;
				case 'null':
					serialized_value = 'null';
					break;
				case 'undefined':
					serialized_value = 'undefined';
					break;
				case 'boolean':
					serialized_value = skeleton[name].value.toString();
					break;
				case 'number':
					serialized_value = skeleton[name].value.toString();
					break;
				case 'function':
					serialized_value = 'r[' + skeleton[name].index + ']';
					uses_references = true;
					break;
				case 'regexp':
					serialized_value = skeleton[name].value.toString();
					break;
				case 'sliceArray':
					serialized_value = 'r[' + skeleton[name].index + '].slice()';
					uses_references = true;
					break;
				case 'inlineArray':
					serialized_value = skeleton[name].is_empty ? '[]' : this._serializeInlineArray(skeleton[name].value);
					break;
				case 'object':
					object_properties = [];
					if (this._serializeSkeleton(skeleton[name].skeleton, class_data, padding + "\t", object_properties)) {
						uses_references = true;
					}
					serialized_value = object_properties.length
						? "{\n\t" + padding + object_properties.join(",\n\t" + padding) + "\n" + padding + "}" : "{}";
					break;
				default:
					Lava.t("[_serializeSkeleton] unknown property descriptor type: " + skeleton[name].type);
			}

			if (Lava.VALID_PROPERTY_NAME_REGEX.test(name) && Lava.JS_KEYWORDS.indexOf(name) == -1) {

				serialized_properties.push(name + ': ' + serialized_value);

			} else {

				serialized_properties.push('"' + name.replace(/\"/g, "\\\"") + '": ' + serialized_value);

			}

		}

		return uses_references;

	},

	/**
	 * Get namespace for a class constructor
	 * @param {Array.<string>} path_segments Path to the namespace of a class. Must start with one of registered roots
	 * @returns {Object}
	 */
	_getNamespace: function(path_segments) {

		var namespace,
			segment_name,
			count = path_segments.length,
			i = 1;

		if (!count) Lava.t("ClassManager: class names must include a namespace, even for global classes.");
		if (!(path_segments[0] in this._root)) Lava.t("[ClassManager] namespace is not registered: " + path_segments[0]);
		namespace = this._root[path_segments[0]];

		for (; i < count; i++) {

			segment_name = path_segments[i];

			if (!(segment_name in namespace)) {

				namespace[segment_name] = {};

			}

			namespace = namespace[segment_name];

		}

		return namespace;

	},

	/**
	 * Get class constructor
	 * @param {string} class_path Full name of a class, or a short name (if namespace is provided)
	 * @param {string} [default_namespace] The default prefix where to search for the class, like <str>"Lava.widget"</str>
	 * @returns {function}
	 */
	getConstructor: function(class_path, default_namespace) {

		if (!(class_path in this.constructors) && default_namespace) {

			class_path = default_namespace + '.' + class_path;

		}

		return this.constructors[class_path];

	},

	/**
	 * Whether to inline or slice() an array in constructor
	 * @param {Array} items
	 * @returns {boolean}
	 */
	isInlineArray: function(items) {

		var result = true,
			i = 0,
			count = items.length;

		for (; i < count; i++) {

			if (this.SIMPLE_TYPES.indexOf(Firestorm.getType(items[i])) == -1) {
				result = false;
				break;
			}

		}

		return result;

	},

	/**
	 * Serialize an array which contains only certain primitive types from `SIMPLE_TYPES` property
	 *
	 * @param {Array} data
	 * @returns {string}
	 */
	_serializeInlineArray: function(data) {

		var tempResult = [],
			i = 0,
			count = data.length,
			type,
			value;

		for (; i < count; i++) {

			type = typeof(data[i]);
			switch (type) {
				case 'string':
					value = Firestorm.String.quote(data[i]);
					break;
				case 'boolean':
				case 'number':
					value = data[i].toString();
					break;
				case 'null':
				case 'undefined':
					value = type;
					break;
				default:
					Lava.t();
			}
			tempResult.push(value);

		}

		return '[' + tempResult.join(", ") + ']';

	},

	/**
	 * Register an existing function as a class constructor for usage with {@link Lava.ClassManager#getConstructor}()
	 * @param {string} class_path Full class path
	 * @param {function} constructor Constructor instance
	 */
	registerExistingConstructor: function(class_path, constructor) {

		if (class_path in this._sources) Lava.t('Class "' + class_path + '" is already defined');
		this.constructors[class_path] = constructor;

	},

	/**
	 * Does a constructor exists
	 * @param {string} class_path Full class path
	 * @returns {boolean}
	 */
	hasConstructor: function(class_path) {

		return class_path in this.constructors;

	},

	/**
	 * Does a class exists
	 * @param {string} class_path
	 * @returns {boolean}
	 */
	hasClass: function(class_path) {

		return class_path in this._sources;

	},

	/**
	 * Build a function that creates class constructor's prototype. Used in export
	 * @param {_cClassData} class_data
	 * @returns {function}
	 */
	_getPrototypeGenerator: function(class_data) {

		var skeleton = class_data.skeleton,
			name,
			serialized_value,
			serialized_actions = ['\tp.Class = cd;'];

		for (name in skeleton) {

			switch (skeleton[name].type) {
				case 'string':
					serialized_value = '"' + skeleton[name].value.replace(/\"/g, "\\\"") + '"';
					break;
				case 'null':
					serialized_value = 'null';
					break;
				case 'undefined':
					serialized_value = 'undefined';
					break;
				case 'boolean':
					serialized_value = skeleton[name].value.toString();
					break;
				case 'number':
					serialized_value = skeleton[name].value.toString();
					break;
				case 'function':
					serialized_value = 'r[' + skeleton[name].index + ']';
					break;
				case 'regexp':
					serialized_value = skeleton[name].value.toString();
					break;
			}

			if (Lava.VALID_PROPERTY_NAME_REGEX.test(name)) {

				serialized_actions.push('p.' + name + ' = ' + serialized_value + ';');

			} else {

				serialized_actions.push('p["' + name.replace(/\"/g, "\\\"") + '"] = ' + serialized_value + ';');

			}

		}

		for (name in class_data.shared) {

			serialized_actions.push('p.' + name + ' = s.' + name + ';');

		}

		return new Function('cd,p', "\tvar r=cd.references,\n\t\ts=cd.shared;\n\n\t" + serialized_actions.join('\n\t') + "\n");

	},

	/**
	 * Server-side export function: create an exported version of a class, which can be loaded by
	 * {@link Lava.ClassManager#loadClass} to save time on client
	 * @param {string} class_path
	 * @returns {_cClassData}
	 */
	exportClass: function(class_path) {

		var class_data = this._sources[class_path],
			shared = {},
			name,
			result;

		for (name in class_data.shared) {

			if (name in class_data.source_object) {

				shared[name] = class_data.source_object[name];

			}

		}

		result = {
			path: class_data.path,
			"extends": class_data['extends'],
			"implements": null,

			prototype_generator: this._getPrototypeGenerator(class_data),
			references: null, // warning: partial array, contains only own class' members
			constructor: this.constructors[class_path],

			skeleton: class_data.skeleton, // may be deleted, if extension via define() is not needed for this class
			source_object: class_data.source_object // may be safely deleted before serialization
		};

		if (!Firestorm.Object.isEmpty(shared)) {
			result.shared = shared;
		}

		if (class_data.parent_class_data) {

			// cut the parent's data and leave only child's
			result.references = class_data.references.slice(
				class_data.parent_class_data.references.length,
				class_data.parent_class_data.references.length + class_data.own_references_count
			);
			result.implements = class_data.implements.slice(class_data.parent_class_data.implements.length);

		} else {

			result.references = class_data.references.slice(0, class_data.own_references_count);
			result.implements = class_data.implements;

		}

		return result;

	},

	/**
	 * Load an object, exported by {@link Lava.ClassManager#exportClass}
	 * @param {_cClassData} class_data
	 */
	loadClass: function(class_data) {

		var parent_data,
			name,
			shared,
			i = 0,
			count,
			own_implements = class_data.implements;

		if (!class_data.shared) class_data.shared = {};
		shared = class_data.shared;
		class_data.name = class_data.path.split('.').pop();

		if (class_data['extends']) {

			parent_data = this._sources[class_data['extends']];
			if (Lava.schema.DEBUG && !parent_data) Lava.t("[loadClass] class parent does not exists: " + class_data['extends']);

			class_data.parent_class_data = parent_data;
			class_data.references = parent_data.references.concat(class_data.references);

			for (name in parent_data.shared) {

				if (!(name in shared)) {

					shared[name] = Array.isArray(parent_data.shared[name])
						? parent_data.shared[name].slice()
						: Firestorm.Object.copy(parent_data.shared[name]);

				} else if (!Array.isArray(shared[name])) {

					Firestorm.implement(shared[name], parent_data.shared[name]);

				}

			}

			class_data.implements = parent_data.implements.concat(class_data.implements);
			class_data.hierarchy_names = parent_data.hierarchy_names.slice();
			class_data.hierarchy_names.push(class_data.name);
			class_data.hierarchy_paths = parent_data.hierarchy_paths.slice();
			class_data.hierarchy_paths.push(class_data.path);

		} else {

			class_data.hierarchy_names = [class_data.name];
			class_data.hierarchy_paths = [class_data.path];
			class_data.parent_class_data = null;

		}

		for (count = own_implements.length; i < count; i++) {

			class_data.references = class_data.references.concat(this._sources[own_implements[i]].references);

		}

		class_data.prototype_generator(class_data, class_data.constructor.prototype);

		this._registerClass(class_data);

	},

	/**
	 * Put a newly built class constructor into it's namespace
	 * @param {_cClassData} class_data
	 */
	_registerClass: function(class_data) {

		var class_path = class_data.path,
			namespace_path = class_path.split('.'),
			class_name = namespace_path.pop(),
			namespace = this._getNamespace(namespace_path);

		if (Lava.schema.DEBUG && ((class_path in this._sources) || (class_path in this.constructors))) Lava.t("Class is already defined: " + class_path);

		if ((class_name in namespace) && namespace[class_name] != null) Lava.t("Class name conflict: '" + class_path + "' property is already defined in namespace path");

		this._sources[class_path] = class_data;
		this.constructors[class_path] = class_data.constructor;
		namespace[class_name] = class_data.constructor;

	},

	/**
	 * Find a class that begins with `base_path` or names of it's parents, and ends with `suffix`
	 * @param {string} base_path
	 * @param {string} suffix
	 * @returns {function}
	 */
	getPackageConstructor: function(base_path, suffix) {

		if (Lava.schema.DEBUG && !(base_path in this._sources)) Lava.t("[getPackageConstructor] Class not found: " + base_path);

		var path,
			current_class = this._sources[base_path],
			result = null;

		do {

			path = current_class.path + suffix;
			if (path in this.constructors) {

				result = this.constructors[path];
				break;

			}

			current_class = current_class.parent_class_data;

		} while (current_class);

		return result;

	},

	/**
	 * Get all names (full paths) of registered classes
	 * @returns {Array.<string>}
	 */
	getClassNames: function() {

		return Object.keys(this._sources);

	},

	/**
	 * Replace function in a class with new body. Class may be in middle of inheritance chain.
	 * Also replaces old method with <kw>null</kw>.
	 *
	 * @param {Object} instance Current class instance, must be <kw>this</kw>
	 * @param {string} instance_class_name Short name of current class
	 * @param {string} function_name Function to replace
	 * @param {string} new_function_name Name of new method from the prototype
	 * @returns {string} name of the method that was replaced
	 */
	patch: function(instance, instance_class_name, function_name, new_function_name) {

		var cd = instance.Class,
			proto = cd.constructor.prototype,
			names = cd.hierarchy_names,
			i = names.indexOf(instance_class_name),
			count = names.length,
			overridden_name;

		if (Lava.schema.DEBUG && i == -1) Lava.t();

		// find method that belongs to this class body
		for (; i < count; i++) {
			overridden_name = names[i] + "$" + function_name;
			// must not use "in" operator, as function body can be removed and assigned null (see below)
			if (proto[overridden_name]) {
				function_name = overridden_name;
				break;
			}
		}

		proto[function_name] = proto[new_function_name];
		// this plays role when class replaces it's method with parent's method (removes it's own method)
		// and parent also wants to apply patches to the same method (see comment above about the "in" operator)
		proto[new_function_name] = null;
		return function_name;

	}

};

if (typeof module != 'undefined' && module.exports) {

	module.exports = Lava;

} else {

	_global.Lava = Lava;

}

}(this));