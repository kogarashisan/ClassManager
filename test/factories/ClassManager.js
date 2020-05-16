
module.exports = function initTests(NodeModules) {

	var ClassManager = NodeModules.ClassManager;

	describe("Basic functionality", function () {

		it("Calls init() and _afterInit()", function () {

			var init_spy = chai.spy();
			var after_init_spy = chai.spy();

			var ClassWithAfterInit = ClassManager.define("ClassWithAfterInit", {
				test: true,
				init: function () {
					init_spy();
				},
				_afterInit: function () {
					after_init_spy();
				}
			});
			new ClassWithAfterInit();

			init_spy.should.have.been.called();
			after_init_spy.should.have.been.called();

		});

		it("'Prepare' works correctly", function () {

			var Class1 = ClassManager.define("Class1", {
				Prepare: function () {
					this.prepare_calls.push(1);
				},
				prepare_calls: []
			});

			var Class2 = ClassManager.define("Class2", {
				Extends: Class1,
				Prepare: function () {
					this.prepare_calls.push(2);
				},
				prepare_calls: []
			});

			var Class3 = ClassManager.define("Class3", {
				Extends: Class2,
				Prepare: function () {
					this.prepare_calls.push(3);
				},
				prepare_calls: []
			});

			var AltClass = ClassManager.define("AltClass", {
				Extends: Class2,
				Prepare: function () {
					this.prepare_calls.push('alt');
				},
				prepare_calls: []
			});

			var instance3 = new Class3();
			var instance2 = new Class2();
			var instance1 = new Class1();
			var alt_instance = new AltClass();

			expect(instance1.prepare_calls).to.deep.equal([1]);
			expect(instance2.prepare_calls).to.deep.equal([2, 1]);
			expect(instance3.prepare_calls).to.deep.equal([3, 2, 1]);
			expect(alt_instance.prepare_calls).to.deep.equal(['alt', 2, 1]);

		});

		it("Correctly serializes inline arrays", function () {

			var class_body = {
				empty_array: [],
				inline_array: [1, "a", null, false, void 0],
				sliced_array1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
				sliced_array2: [{}, [], function () {}]
			};

			var Class = ClassManager.define("Class", class_body);
			var instance = new Class();

			expect(instance.empty_array).to.deep.equal([]);
			expect(instance.inline_array).to.deep.equal(class_body.inline_array);
			expect(instance.sliced_array1).to.deep.equal(class_body.sliced_array1);
			expect(instance.sliced_array2).to.deep.equal(class_body.sliced_array2);

			expect(instance.Class.references).to.not.contain(class_body.inline_array);
			expect(instance.Class.references).to.contain(class_body.sliced_array1);
			expect(instance.Class.references).to.contain(class_body.sliced_array2);

		});

		it("Allows nulls in parents to become methods in child", function () {

			var Parent = ClassManager.define("Parent", {
				test_property: null
			});

			ClassManager.define("Child", {
				Extends: Parent,
				test_property: function () {}
			});

		});

		it("Allows only valid class names", function () {

			// this must work
			ClassManager.define("Test_9", {});

			expect(function () {
				ClassManager.define("0Test", {});
			}).to.throw(/invalid class name/);

		});

		it("Does not allow to replace a method from parent with other values", function () {

			var Parent = ClassManager.define("Parent", {
				test_property: function () {}
			});

			expect(function () {
				ClassManager.define("Child", {
					Extends: Parent,
					test_property: null
				});
			}).to.throw(/must not become/);

		});

		it("Creates an abstract constructor for abstract classes", function () {

			var AbstractClass = ClassManager.define("AbstractClass", {
				Class: {
					is_abstract: true
				}
			});

			expect(function () {
				new AbstractClass();
			}).to.throw(/create an instance of abstract class/);

		});

		it("Does not allow calling class constructors without `new` in DEBUG mode", function () {

			var TestClass = ClassManager.define("TestClass", {});

			expect(function () {
				TestClass();
			}).to.throw(/Class constructor was called without `new`/);

		});

		it("Allows only valid classes to be extended", function () {

			expect(function () {
				ClassManager.define("Child", {
					Extends: function () {}
				});
			}).to.throw(/Malformed directive/);

		});

		it("InstanceOf works correctly", function () {

			var Parent = ClassManager.define("Parent", {});

			var Child1 = ClassManager.define("Child1", {
				Extends: Parent
			});

			var Child2 = ClassManager.define("Child2", {
				Implements: [Parent]
			});

			var Child3 = ClassManager.define("Child3", {
				Extends: Child1
			});

			var Parent_instance = new Parent();
			var Child1_instance = new Child1();
			var Child2_instance = new Child2();
			var Child3_instance = new Child3();

			assert(ClassManager.instanceOf(Parent_instance, Parent));

			assert(ClassManager.instanceOf(Child1_instance, Child1));
			assert(ClassManager.instanceOf(Child1_instance, Parent));

			assert(ClassManager.instanceOf(Child2_instance, Parent));
			assert(ClassManager.instanceOf(Child2_instance, Child2));

			assert(ClassManager.instanceOf(Child3_instance, Child3));
			assert(ClassManager.instanceOf(Child3_instance, Child1));
			assert(ClassManager.instanceOf(Child3_instance, Parent));

			expect(function() {
				ClassManager.instanceOf(Child1_instance, function () {})
			}).to.throw();

		});

		it("Property names serialization works correcly", function () {

			var Class = ClassManager.define("Class", {
				property: {
					"$#%": "test"
				},
				"$#%": "test"
			});

			var instance = new Class();
			assert(instance["$#%"] == 'test' && instance.property["$#%"] == 'test');

		});

		it("Correcly serializes reference types", function () {

			var data = {
				property: {
					test_method: function () {},
					reference_array: [{}],
					empty_array: [],
					inline_array: [1, 2, 3],
					primitive_type: null,
					inner_property: {
						test_method: function () {}
					}
				}
			};
			var Class = ClassManager.define("Class", data);
			var instance = new Class();

			assert(instance.property.test_method === data.property.test_method);
			assert(instance.property.primitive_type === null);
			assert(instance.property.inner_property.test_method === data.property.inner_property.test_method);

			expect(instance.property.reference_array).to.deep.equal(data.property.reference_array);
			expect(instance.property.inline_array).to.deep.equal(data.property.inline_array);
			expect(instance.property.empty_array).to.deep.equal([]);

		});

		it("[tests for coverage]", function () {

			expect(function () {
				ClassManager.define("Parent", {
					test: new Error()
				});
			}).to.throw();

			expect(function () {
				ClassManager.define("Parent", {
					test: void 0
				});
			}).to.throw("undefined class members are not allowed");

		});

	});

	describe("Inheritance", function () {

		it("Renames methods correctly", function () {

			var parent_spy = chai.spy();
			var child_spy = chai.spy();

			var Parent = ClassManager.define("Parent", {
				doSomething: function () {
					parent_spy();
				}
			});

			var Child = ClassManager.define("Child", {
				Extends: Parent,
				doSomething: function () {
					child_spy();
					this.Parent$doSomething();
				}
			});

			var instance = new Child();
			instance.doSomething();

			assert(
				typeof Parent.prototype.doSomething == 'function'
				&& typeof Child.prototype.doSomething == 'function'
				&& typeof Child.prototype.Parent$doSomething == 'function'
				&& Child.prototype.Parent$doSomething === Parent.prototype.doSomething
			);

			parent_spy.should.have.been.called();
			child_spy.should.have.been.called();

		});

		it("Merges objects correctly", function () {

			var Parent = ClassManager.define("Parent", {
				property: {
					test_parent: 'test_parent'
				}
			});

			var Child = ClassManager.define("Child", {
				Extends: Parent,
				property: {
					test_child: "test_child"
				}
			});

			var instance = new Child();

			expect(instance.property).to.deep.equal({
				test_parent: 'test_parent',
				test_child: "test_child"
			});

		});

	});

	describe("Implements directive", function () {

		it("Checks argument validity", function () {

			expect(function () {
				ClassManager.define("Child", {
					Implements: null
				});
			}).to.throw(/Malformed directive/);

			expect(function () {
				ClassManager.define("Child", {
					Implements: [null]
				});
			}).to.throw(/is not valid/);

			expect(function () {
				ClassManager.define("Child", {
					Implements: [function () {}]
				});
			}).to.throw(/is not valid/);

		});

		it("Merges reference types correctly", function () {

			var parent_spy = chai.spy();
			var child_spy = chai.spy();

			var Parent = ClassManager.define("Parent", {
				doSomething: function () {
					parent_spy();
				},
				doOtherThing: function () {}
			});

			var Child = ClassManager.define("Child", {
				Implements: [Parent],
				doSomething: function () {
					child_spy();
				}
			});

			var instance = new Child();
			instance.doSomething();

			assert(instance.doOtherThing === Parent.prototype.doOtherThing);
			parent_spy.should.not.have.been.called();
			child_spy.should.have.been.called();

		});

	});

	describe("Shared and Merged", function () {

		it("'Merged' directive checks argument validity", function () {

			expect(function () {
				ClassManager.define("Test", {
					Merged: ['merged_property'],
					merged_property: {}
				});
			}).to.throw(/property is not array/);

		});

		it("'Merged' directive works", function () {

			var Parent = ClassManager.define("Parent", {
				Merged: ['merged_array'],
				merged_array: [1]
			});

			var Child = ClassManager.define("Child", {
				Extends: Parent,
				merged_array: [2]
			});

			var parent_instance = new Parent();
			var child_instance = new Child();

			expect(parent_instance.merged_array).to.deep.equal([1]);
			expect(child_instance.merged_array).to.deep.equal([1, 2]);

			assert(!parent_instance.hasOwnProperty('merged_array') && !child_instance.hasOwnProperty('merged_array'));

		});

		// If a class has a member with the same name in prototype and in instance
		// - then member from prototype is hidden by member from instance.
		it("Does not allow member hiding", function () {

			var TestMixin = ClassManager.define("TestMixin", {
				test_property: {}
			});

			expect(function () {
				ClassManager.define("TestTarget", {
					Implements: [TestMixin],
					Shared: ['test_property'],
					test_property: {}
				});
			}).to.throw(/class member is hidden/);

		});

		it("'Shared' works correctly", function () {

			var class_body = {
				Shared: ['shared_boolean', 'shared_number', 'shared_string', 'shared_null', 'shared_array'],
				shared_boolean: false,
				shared_number: 1,
				shared_string: 'asd',
				shared_null: null,
				shared_array: [1, 'a', null]
			};
			var TestClass = ClassManager.define("TestClass", class_body);
			var instance = new TestClass();

			var child_body = {
				Extends: TestClass,
				shared_boolean: true,
				shared_number: 2,
				shared_string: 'test',
				shared_null: {}, // now an object
				shared_array: [2, 'b', {}]
			};
			var ChildClass = ClassManager.define("ChildClass", child_body);
			var child_instance = new ChildClass();

			function assertSharedValid(instance, class_body, shared_names) {
				for (var i = 0, count = shared_names.length; i < count; i++) {
					var property_name = shared_names[i];
					assert(
						!instance.hasOwnProperty(property_name)
						&& (property_name in instance)
						&& instance[property_name] === class_body[property_name],
						property_name
					);
				}
			}

			assertSharedValid(instance, class_body, class_body.Shared);
			assertSharedValid(child_instance, child_body,  class_body.Shared);

		});

		it("'Shared' correctly handles objects", function () {

			var class_body = {
				Shared: ['shared_object'],
				shared_object: {
					counter: 0
				}
			};
			var TestClass = ClassManager.define("TestClass", class_body);
			var instance = new TestClass();

			var child_body = {
				Extends: TestClass,
				shared_object: {
					something_else: "test"
				}
			};
			var ChildClass = ClassManager.define("ChildClass", child_body);
			var child_instance = new ChildClass();

			assert(!instance.hasOwnProperty('shared_object') && instance['shared_object'] === class_body['shared_object']);
			expect(instance.shared_object).to.deep.equal({
				counter: 0
			});

			assert(!child_instance.hasOwnProperty('shared_object') && child_instance.shared_object);
			expect(child_instance.shared_object).to.deep.equal({
				counter: 0,
				something_else: "test"
			});

		});

	});

};