#Standalone version of Lava.ClassManager

One of the fastest and most convenient class systems in the world.

Quick facts:
- Classes can be generated on server and in browser
- Supports multiple inheritance
- Monomorphism optimizations
- Has powerful features like run-time prototype patching and shared members

Docs:
- [Basic tutorial](http://www.lava-framework.com/www/doc.html#tutorial=Classes)
- [Detailed reference](http://www.lava-framework.com/www/doc.html#reference=Classes)
- [Patches and static constructors](http://www.lava-framework.com/www/doc.html#reference=ClassPatches)
- [Packages](http://www.lava-framework.com/www/doc.html#reference=Packages)
- [API](http://www.lava-framework.com/www/doc.html#object=Lava.ClassManager)

Standalone version is self-contained (it does not have any dependencies, like the main framework).

##Performance

ClassManager can generate classes in two modes, depending on `is_monomorphic` switch.
Monomorphic mode generates classes with slower constructors, but fast method calls 
(due to the fact, that all class instances will have the same internal type, reducing method polymorphism).
Polymorphic mode generates fast constructors with slower method calls.

<i>High quality polymorphic tests are coming soon...</i> 

Meanwhile you can have a look at the following tests, which are not 100% correct:
- <a href="http://jsperf.com/liquidlava-class-system-performance/10">ClassManager vs native classes</a> 
(`counter` is overflown, and no polymorphism)
- <a href="http://jsperf.com/js-inheritance-performance/62">Hybrid test of a dozen of class systems</a> 
(incorrectly mixes class creation time and method calls)

<b>Constructor generation performance</b>

Class generation in ClassManager is slower in comparison to other class systems, but:
- it's still very fast, so you can comfortably use it in browser
- generated classes are extremely fast
- <i>classes can be generated on server</i> (like with CoffeeScript or TypeScript preprocessors)

There will be no performance tests for class constructor generation time, 
cause it's not fair to compare class systems with language preprocessors.

<b>Class construction performance</b>

<i>Coming soon...</i>

<b>Method call performance</b>

<i>Coming soon...</i>

##Usage example

You may either `require("lava-class-manager")` (in Node.js environment) or include it directly in browser.
You will get a partial copy of Lava object with ClassManager and it's dependencies.

```javascript
// in Node.js environment:
// var Lava = require("lava-class-manager");
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

##Limitations

While using compression - you can not mangle method names in class bodies, cause this will break inheritance.
Good-behaving compression tools will not do it, anyway.

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