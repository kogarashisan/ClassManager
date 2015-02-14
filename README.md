#Standalone version of Lava.ClassManager

Docs:
- [Basic tutorial](http://www.lava-framework.com/www/doc.html#tutorial=Classes)
- [Reference](http://www.lava-framework.com/www/doc.html#reference=Classes)
- [Patches and static constructors](http://www.lava-framework.com/www/doc.html#reference=ClassPatches)
- [Packages](http://www.lava-framework.com/www/doc.html#reference=Packages)

Attention: standalone version is self-contained (it does not depend on MooTools or anything else).

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

##Changelog

<b>1.0.2</b>

- [Feature] Added possibility to store arrays in Shared
- [Refactoring] Removed _cClassData#level as redundant
- [Refactoring] exportClass now produces slightly less data
- [Refactoring] Now it ensures that members, which are shared in parent class, are not marked as shared in inherited class
- [Refactoring] Shared objects are now copied directly from class body, instead of shallow copy.
May matter, if you create class instances before calling ClassManager#exportClass, otherwise ignore

<b>1.0.1</b>

- Added `Lava.instanceOf()` method - analog of `instanceof` JS operator