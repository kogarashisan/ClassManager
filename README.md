#Standalone version of Lava.ClassManager

See the docs:
http://www.lava-framework.com/

##Usage example

You may either require(`lib/class_manager.js`) or include it directly in browser.
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
```