<i>Update 09.03.15: "polymorphic mode" and "full export" features are deprecated.</i>

#Standalone version of Lava.ClassManager

[![npm](https://img.shields.io/npm/v/lava-class-manager.svg)](https://www.npmjs.com/package/lava-class-manager)
[![npm](https://img.shields.io/npm/l/lava-class-manager.svg)]()

One of the fastest and most convenient class systems in the world.

Quick facts:
- Speed is comparable to native hand-written classes
- Powerful features like run-time prototype patching and shared members
- Classes can be generated on server and in browser
- Supports multiple inheritance

Docs:
- [Basic tutorial](http://www.lava-framework.com/www/doc/tutorial/Classes.html)
- [Detailed reference](http://www.lava-framework.com/www/doc/reference/Classes.html)
- [Patches and static constructors](http://www.lava-framework.com/www/doc/reference/ClassPatches.html)
- [Packages](http://www.lava-framework.com/www/doc/reference/Packages.html)
- [API](http://www.lava-framework.com/www/doc/object/Lava.ClassManager.html)

Standalone version is self-contained (it does not have any dependencies, like the main framework).

##Performance

Performance comparison of the fastest class systems:
- Overridden method calls: http://jsperf.com/js-inheritance-method-calls/2
- Object construction: http://jsperf.com/js-inheritance-object-construction

For your convenience, performance tests have their own repository:
https://github.com/kogarashisan/PerfTests

##Performance notes

ClassManager can generate classes in two modes, depending on `is_monomorphic` switch.
Monomorphic mode generates classes with slower constructors, but fast method calls 
(due to the fact, that all class instances will have the same internal type, reducing method polymorphism).
Polymorphic mode generates fast constructors with slower method calls.

<b>Constructor generation performance</b>

Creating a class constructor takes some time in all class systems (not class instance, but the constructor).
There are no performance tests for class definitions, cause it's not fair to compare 
browser-only class systems with language preprocessors.

You should know, that class generation in ClassManager is slower in comparison to other systems, but:
- it's still very fast, so you can comfortably use it in browser
- generated classes are extremely fast
- <i>classes can be generated on server</i> (like with CoffeeScript or TypeScript preprocessors)

##Usage example

ClassManager is available as NPM module, which can be installed with the following command:

```
npm install lava-class-manager
```

You may either `require("lava-class-manager")` (in Node.js environment) or include it directly in browser.
You will get a <i>partial copy of Lava object</i> with ClassManager and it's dependencies.

```javascript
// in Node.js environment:
var Lava = require("lava-class-manager");
// in browser:
// <script src="path/to/ClassManager/lib/class_manager.js"></script>

// namespaces is a must
Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
'global.Animal',
{
	name: null,
	steps: 0,
	food: [], // will NOT be shared across class instances
	
	// constructor
	init: function(name) {
		this.name = name;
	},
	walk: function() {
		this.steps++;
	}
});

Lava.ClassManager.define(
'global.Cat',
{
	Extends: 'global.Animal',
	init: function(name) {
		this.Animal$init(name); // parent method call
	}
});

var cat = new Cat("Garfield");
cat.walk();

Lava.instanceOf(cat, "global.Animal");
```

##JSDoc annotations and IDE support

You can help IDE to recognize ClassManager inheritance model by adding proper JSDoc comments to each class:

```
Lava.define(
'Lava.data.MetaStorage',
/**
 * @lends Lava.data.MetaStorage#
 * @extends Lava.data.ModuleAbstract
 * @extends Lava.mixin.Properties
 */
{
	Extends: 'Lava.data.ModuleAbstract',
	Implements: 'Lava.mixin.Properties',
	// ...
});
```

Parent class and all mixins should be listed with `@extends` JSDoc tag - this will enable IDE hinting for parent members.
Class itself should be exported by `@lends` tag - this will enable hinting on constructed object instances.
This technique works in PHPStorm. Unfortunately, parent method calls can not be automatically recognized at this moment.

##Extras

You can reuse several classes, that come with the main framework:
- [Lava.system.Serializer](http://www.lava-framework.com/www/doc/class/Lava.system.Serializer.html) - 
pretty-print any JavaScript objects (even those, which contain functions). 
[Source](https://github.com/kogarashisan/LiquidLava/blob/master/src/System/Serializer.class.js)
- [Lava.mixin.Observable](http://www.lava-framework.com/www/doc/class/Lava.mixin.Observable.html) - 
carefully thought-out events for your classes. 
[Source](https://github.com/kogarashisan/LiquidLava/blob/master/src/Mixin/Observable.class.js)
- [Lava.mixin.Properties](http://www.lava-framework.com/www/doc/class/Lava.mixin.Properties.html) -
adds `get()` and `set()` methods to manipulate properties and fires two kinds of "changed" events when they change.
[Source](https://github.com/kogarashisan/LiquidLava/blob/master/src/Mixin/Properties.class.js)

##Limitations

While using compression - you can not mangle method names in class bodies, cause this will break inheritance.
Good-behaving compression tools will not do it, anyway.

There is no official way to define a true private method: private methods in JavaScript are considered 
bad practice by the author, cause they usually come at cost of inflexibility and speed. Instead, you are recommended 
to use protected methods (name begins wih underscore). But if you really need it - you can create a private method with
traditional techniques.

##Changelog

<b>1.1.0</b>

- [Feature] Added `Lava.ClassManager.is_monomorphic` property (`true` by default) - in this mode
generated constructors will preallocate all class properties to reduce function polymorphism. 
This will make construction slower, but operation will be faster.
Each `_cClassData` now has `is_monomorphic` property, which indicates if it was built in monomorphic mode.
- [Feature] Added `loadClasses()` and `loadSkeletons()` convenience methods
- [Refactoring] RegExp objects are now moved to prototype. If you want to have unique copy of regular expression object
for each class instance - then you should assign it in constructor.
- [Refactoring] Changed format of exported classes: now it exports both `references` and `own_references` arrays -
you should delete either one of them. If you leave `references` - then you will get large, but fast and
truly monomorphic class with it's own methods. In most scenarios you will want to leave `own_references` for smaller output.
- [Refactoring] Changed format of generated skeleton (if you did not export classes - then ignore)
- [Refactoring] Renamed ClassManager#INLINE_SIMPLE_ARRAYS -> inline_simple_arrays
- [Refactoring] Added Lava.define - proxy to Lava.ClassManager.define
- [Fix] Fixed several serialization bugs. 

Light performance improvements.

<b>1.0.3</b>
- [Fix] Fixed an issue in Node.js environment, when generated constructor was invalid. Slightly improved performance.

<b>1.0.2</b>

- [Feature] Added possibility to store arrays in Shared
- [Refactoring] Removed _cClassData#level as redundant
- [Refactoring] exportClass now produces slightly less data
- [Refactoring] Now it ensures that members, which are shared in parent class, are not marked as shared in inherited class
- [Refactoring] Shared objects are now copied directly from class body, instead of shallow copy.
May matter, if you create class instances before calling ClassManager#exportClass, otherwise ignore

<b>1.0.1</b>

- Added `Lava.instanceOf()` method - analog of `instanceof` JS operator