import { describe, it } from 'node:test'
import assert from 'node:assert'
import { isMiddlewareFunction, isClass } from './compose.js'

describe('Compose Utility Functions', () => {
  describe('isMiddlewareFunction', () => {
    it('should return true for regular functions', () => {
      function regularFunction() {}
      const arrowFunction = () => {}
      const asyncFunction = async () => {}

      assert.strictEqual(isMiddlewareFunction(regularFunction), true)
      assert.strictEqual(isMiddlewareFunction(arrowFunction), true)
      assert.strictEqual(isMiddlewareFunction(asyncFunction), true)
    })

    it('should return false for class constructors', () => {
      class TestClass {}
      function TestFunction() {}

      // Classes have non-writable prototype
      assert.strictEqual(isMiddlewareFunction(TestClass), false)

      // Regular functions should return true
      assert.strictEqual(isMiddlewareFunction(TestFunction), true)
    })

    it('should return false for non-function values', () => {
      assert.strictEqual(isMiddlewareFunction(null), false)
      assert.strictEqual(isMiddlewareFunction(undefined), false)
      assert.strictEqual(isMiddlewareFunction('string'), false)
      assert.strictEqual(isMiddlewareFunction(123), false)
      assert.strictEqual(isMiddlewareFunction({}), false)
      assert.strictEqual(isMiddlewareFunction([]), false)
      assert.strictEqual(isMiddlewareFunction(true), false)
    })

    it('should handle bound functions', () => {
      function testFunction() {}
      const boundFunction = testFunction.bind(null)

      assert.strictEqual(isMiddlewareFunction(boundFunction), true)
    })

    it('should handle function expressions', () => {
      const functionExpression = function () {}
      const namedFunctionExpression = function namedFunc() {}

      assert.strictEqual(isMiddlewareFunction(functionExpression), true)
      assert.strictEqual(isMiddlewareFunction(namedFunctionExpression), true)
    })

    it('should handle generator functions', () => {
      function* generatorFunction() {
        yield 1
      }

      assert.strictEqual(isMiddlewareFunction(generatorFunction), true)
    })

    it('should handle async generator functions', () => {
      async function* asyncGeneratorFunction() {
        yield 1
      }

      assert.strictEqual(isMiddlewareFunction(asyncGeneratorFunction), true)
    })
  })

  describe('isClass', () => {
    it('should return true for ES6 classes', () => {
      class TestClass {}
      class ExtendedClass extends TestClass {}

      assert.strictEqual(isClass(TestClass), true)
      assert.strictEqual(isClass(ExtendedClass), true)
    })

    it('should return false for regular functions', () => {
      function regularFunction() {}
      const arrowFunction = () => {}
      const asyncFunction = async () => {}

      assert.strictEqual(isClass(regularFunction), false)
      assert.strictEqual(isClass(arrowFunction), false)
      assert.strictEqual(isClass(asyncFunction), false)
    })

    it('should return false for constructor functions with writable prototype', () => {
      function ConstructorFunction() {}

      // Constructor functions have writable prototype by default
      assert.strictEqual(isClass(ConstructorFunction), false)
    })

    it('should return false for non-function values', () => {
      assert.strictEqual(isClass(null), false)
      assert.strictEqual(isClass(undefined), false)
      assert.strictEqual(isClass('string'), false)
      assert.strictEqual(isClass(123), false)
      assert.strictEqual(isClass({}), false)
      assert.strictEqual(isClass([]), false)
      assert.strictEqual(isClass(true), false)
    })

    it('should handle built-in classes', () => {
      assert.strictEqual(isClass(Array), true)
      assert.strictEqual(isClass(Object), true)
      assert.strictEqual(isClass(Date), true)
      assert.strictEqual(isClass(Error), true)
      assert.strictEqual(isClass(Map), true)
      assert.strictEqual(isClass(Set), true)
    })

    it('should handle classes with static methods', () => {
      class ClassWithStatics {
        static staticMethod() {}
        instanceMethod() {}
      }

      assert.strictEqual(isClass(ClassWithStatics), true)
    })

    it('should handle classes with getters and setters', () => {
      class ClassWithAccessors {
        private _value: any
        get value() {
          return this._value
        }
        set value(val) {
          this._value = val
        }
      }

      assert.strictEqual(isClass(ClassWithAccessors), true)
    })

    it('should handle anonymous classes', () => {
      const AnonymousClass = class {}

      assert.strictEqual(isClass(AnonymousClass), true)
    })

    it('should handle classes with constructors', () => {
      class ClassWithConstructor {
        constructor(public value: string) {}
      }

      assert.strictEqual(isClass(ClassWithConstructor), true)
    })
  })

  describe('integration scenarios', () => {
    it('should correctly distinguish between classes and functions', () => {
      class TestClass {}
      function TestFunction() {}
      const arrowFunction = () => {}

      // Classes should be identified as classes, not middleware functions
      assert.strictEqual(isClass(TestClass), true)
      assert.strictEqual(isMiddlewareFunction(TestClass), false)

      // Functions should be identified as middleware functions, not classes
      assert.strictEqual(isClass(TestFunction), false)
      assert.strictEqual(isMiddlewareFunction(TestFunction), true)

      assert.strictEqual(isClass(arrowFunction), false)
      assert.strictEqual(isMiddlewareFunction(arrowFunction), true)
    })

    it('should handle edge cases with prototype manipulation', () => {
      function TestFunction() {}

      // Initially should be a function, not a class
      assert.strictEqual(isClass(TestFunction), false)
      assert.strictEqual(isMiddlewareFunction(TestFunction), true)

      // Make prototype non-writable (like a class)
      Object.defineProperty(TestFunction, 'prototype', {
        writable: false,
        value: TestFunction.prototype,
      })

      // Now should be detected as a class
      assert.strictEqual(isClass(TestFunction), true)
      assert.strictEqual(isMiddlewareFunction(TestFunction), false)
    })

    it('should handle functions without prototype property', () => {
      const arrowFunction = () => {}

      // Arrow functions don't have a prototype property
      assert.strictEqual(isClass(arrowFunction), false)
      assert.strictEqual(isMiddlewareFunction(arrowFunction), true)
    })

    it('should handle bound methods', () => {
      class TestClass {
        method() {}
      }

      const instance = new TestClass()
      const boundMethod = instance.method.bind(instance)

      assert.strictEqual(isClass(boundMethod), false)
      assert.strictEqual(isMiddlewareFunction(boundMethod), true)
    })
  })
})
