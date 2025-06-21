import { describe, it } from 'node:test'
import assert from 'node:assert'
import { guards, AppState } from './types.js'

describe('Guards Utility Functions', () => {
  describe('isStartable', () => {
    it('should return true for objects with start method', () => {
      const startable = {
        start() {
          return Promise.resolve()
        },
      }

      assert.strictEqual(guards.isStartable(startable), true)
    })

    it('should return true for objects with start getter', () => {
      const startable = {
        get start() {
          return () => Promise.resolve()
        },
      }

      assert.strictEqual(guards.isStartable(startable), true)
    })

    it('should return false for objects without start method', () => {
      const notStartable = {
        stop() {
          return Promise.resolve()
        },
      }

      assert.strictEqual(guards.isStartable(notStartable), false)
    })

    it('should return false for null and undefined', () => {
      assert.strictEqual(guards.isStartable(null), false)
      assert.strictEqual(guards.isStartable(undefined), false)
    })

    it('should return false for primitives', () => {
      assert.strictEqual(guards.isStartable('string'), false)
      assert.strictEqual(guards.isStartable(123), false)
      assert.strictEqual(guards.isStartable(true), false)
    })
  })

  describe('isStoppable', () => {
    it('should return true for objects with stop method', () => {
      const stoppable = {
        stop() {
          return Promise.resolve()
        },
      }

      assert.strictEqual(guards.isStoppable(stoppable), true)
    })

    it('should return true for objects with stop getter', () => {
      const stoppable = {
        get stop() {
          return () => Promise.resolve()
        },
      }

      assert.strictEqual(guards.isStoppable(stoppable), true)
    })

    it('should return false for objects without stop method', () => {
      const notStoppable = {
        start() {
          return Promise.resolve()
        },
      }

      assert.strictEqual(guards.isStoppable(notStoppable), false)
    })

    it('should return false for null and undefined', () => {
      assert.strictEqual(guards.isStoppable(null), false)
      assert.strictEqual(guards.isStoppable(undefined), false)
    })
  })

  describe('isContextInitializer', () => {
    it('should return true for objects with initializeContext method', () => {
      const initializer = {
        initializeContext(ctx: any) {
          return ctx
        },
      }

      assert.strictEqual(guards.isContextInitializer(initializer), true)
    })

    it('should return true for objects with initializeContext getter', () => {
      const initializer = {
        get initializeContext() {
          return (ctx: any) => ctx
        },
      }

      assert.strictEqual(guards.isContextInitializer(initializer), true)
    })

    it('should return false for objects without initializeContext method', () => {
      const notInitializer = {
        someOtherMethod() {
          return {}
        },
      }

      assert.strictEqual(guards.isContextInitializer(notInitializer), false)
    })

    it('should return false for null and undefined', () => {
      assert.strictEqual(guards.isContextInitializer(null), false)
      assert.strictEqual(guards.isContextInitializer(undefined), false)
    })
  })

  describe('hasMiddleware', () => {
    it('should return true for objects with middleware method', () => {
      const middleware = {
        middleware(ctx: any, next: any) {
          return next()
        },
      }

      assert.strictEqual(guards.hasMiddleware(middleware), true)
    })

    it('should return true for objects with middleware getter', () => {
      const middleware = {
        get middleware() {
          return (ctx: any, next: any) => next()
        },
      }

      assert.strictEqual(guards.hasMiddleware(middleware), true)
    })

    it('should return false for objects without middleware method', () => {
      const notMiddleware = {
        someOtherMethod() {
          return {}
        },
      }

      assert.strictEqual(guards.hasMiddleware(notMiddleware), false)
    })

    it('should return false for null and undefined', () => {
      assert.strictEqual(guards.hasMiddleware(null), false)
      assert.strictEqual(guards.hasMiddleware(undefined), false)
    })
  })

  describe('isMiddleware', () => {
    it('should return true for valid middleware with 2 parameters', () => {
      const middleware = {
        middleware(ctx: any, next: any) {
          return next()
        },
      }

      assert.strictEqual(guards.isMiddleware(middleware), true)
    })

    it('should return true for middleware getter', () => {
      const middleware = {
        get middleware() {
          return (ctx: any, next: any) => next()
        },
      }

      assert.strictEqual(guards.isMiddleware(middleware), true)
    })

    it('should return false for middleware with wrong parameter count', () => {
      const invalidMiddleware = {
        middleware(ctx: any) {
          return ctx
        },
      }

      assert.strictEqual(guards.isMiddleware(invalidMiddleware), false)
    })

    it('should return false for middleware with too many parameters', () => {
      const invalidMiddleware = {
        middleware(ctx: any, next: any, extra: any) {
          return next()
        },
      }

      assert.strictEqual(guards.isMiddleware(invalidMiddleware), false)
    })

    it('should return false for objects without middleware', () => {
      const notMiddleware = {
        someOtherMethod() {
          return {}
        },
      }

      assert.strictEqual(guards.isMiddleware(notMiddleware), false)
    })
  })

  describe('checkUsableMiddleware', () => {
    it('should return true for valid middleware', () => {
      const middleware = {
        middleware(ctx: any, next: any) {
          return next()
        },
      }

      assert.strictEqual(guards.checkUsableMiddleware(middleware), true)
    })

    it('should throw TypeError for invalid middleware', () => {
      const invalidMiddleware = {
        middleware(ctx: any) {
          return ctx
        },
      }

      assert.throws(
        () => guards.checkUsableMiddleware(invalidMiddleware),
        /Middleware must accept two arguments, context and next/,
      )
    })

    it('should throw TypeError for objects without middleware', () => {
      const notMiddleware = {
        someOtherMethod() {
          return {}
        },
      }

      assert.throws(
        () => guards.checkUsableMiddleware(notMiddleware),
        /Middleware must accept two arguments, context and next/,
      )
    })
  })

  describe('canStart', () => {
    it('should return true for New state', () => {
      assert.strictEqual(guards.canStart(AppState.New), true)
    })

    it('should return false for Starting state', () => {
      assert.strictEqual(guards.canStart(AppState.Starting), false)
    })

    it('should return false for Started state', () => {
      assert.strictEqual(guards.canStart(AppState.Started), false)
    })

    it('should return false for Running state', () => {
      assert.strictEqual(guards.canStart(AppState.Running), false)
    })

    it('should return false for Stopping state', () => {
      assert.strictEqual(guards.canStart(AppState.Stopping), false)
    })

    it('should return false for Stopped state', () => {
      assert.strictEqual(guards.canStart(AppState.Stopped), false)
    })

    it('should return false for combined states', () => {
      assert.strictEqual(guards.canStart(AppState.Started | AppState.Running), false)
      assert.strictEqual(guards.canStart(AppState.Starting | AppState.Stopping), false)
    })
  })

  describe('integration scenarios', () => {
    it('should handle objects with multiple lifecycle methods', () => {
      const fullLifecycle = {
        start() {
          return Promise.resolve()
        },
        stop() {
          return Promise.resolve()
        },
        middleware(ctx: any, next: any) {
          return next()
        },
        initializeContext(ctx: any) {
          return ctx
        },
      }

      assert.strictEqual(guards.isStartable(fullLifecycle), true)
      assert.strictEqual(guards.isStoppable(fullLifecycle), true)
      assert.strictEqual(guards.hasMiddleware(fullLifecycle), true)
      assert.strictEqual(guards.isMiddleware(fullLifecycle), true)
      assert.strictEqual(guards.isContextInitializer(fullLifecycle), true)
      assert.strictEqual(guards.checkUsableMiddleware(fullLifecycle), true)
    })

    it('should handle class instances', () => {
      class TestUsable {
        start() {
          return Promise.resolve()
        }

        middleware(ctx: any, next: any) {
          return next()
        }
      }

      const instance = new TestUsable()

      assert.strictEqual(guards.isStartable(instance), true)
      assert.strictEqual(guards.hasMiddleware(instance), true)
      assert.strictEqual(guards.isMiddleware(instance), true)
      assert.strictEqual(guards.checkUsableMiddleware(instance), true)
    })

    it('should handle edge cases with property descriptors', () => {
      const objectWithDescriptors = {}

      Object.defineProperty(objectWithDescriptors, 'middleware', {
        value: function (ctx: any, next: any) {
          return next()
        },
        enumerable: true,
        configurable: true,
      })

      assert.strictEqual(guards.hasMiddleware(objectWithDescriptors), true)
      assert.strictEqual(guards.isMiddleware(objectWithDescriptors), true)
    })
  })
})
