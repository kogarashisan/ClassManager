
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

/*:BUILD_FOOTER_CUTOFF:*/

/*ES5>*/
module.exports = ERROR_DESCRIPTIONS;
/*<ES5*/

/*ES6>
export default ERROR_DESCRIPTIONS;
<ES6*/