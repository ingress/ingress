import { describe, it } from 'node:test'
import assert from 'node:assert'
import { forwardRef, resolveForwardRef, forTest } from './di.js'

describe('Forward References', () => {
  describe('forwardRef', () => {
    it('should create a forward reference function', () => {
      class TestService {}
      const forwardRefFn = forwardRef(() => TestService)

      assert.strictEqual(typeof forwardRefFn, 'function')
      assert.strictEqual(forwardRefFn(), TestService)
    })

    it('should mark function with forward ref symbol', () => {
      class TestService {}
      const forwardRefFn = forwardRef(() => TestService)

      // The function should have the forward ref marker
      assert.strictEqual(Object(forwardRefFn)[Symbol.for('ingress:forwardRef')], true)
    })

    it('should preserve original function behavior', () => {
      class TestService {}
      const originalFn = () => TestService
      const forwardRefFn = forwardRef(originalFn)

      assert.strictEqual(forwardRefFn(), TestService)
      assert.strictEqual(forwardRefFn(), originalFn())
    })

    it('should work with different types of constructors', () => {
      class ClassService {}
      function FunctionService() {}

      const classForwardRef = forwardRef(() => ClassService)
      const functionForwardRef = forwardRef(() => FunctionService as any)

      assert.strictEqual(classForwardRef(), ClassService)
      assert.strictEqual(functionForwardRef(), FunctionService)
    })
  })

  describe('resolveForwardRef', () => {
    it('should resolve forward reference functions', () => {
      class TestService {}
      const forwardRefFn = forwardRef(() => TestService)

      const resolved = resolveForwardRef(forwardRefFn)
      assert.strictEqual(resolved, TestService)
    })

    it('should return non-forward-ref values unchanged', () => {
      class TestService {}
      const regularFunction = () => TestService
      const regularValue = TestService

      assert.strictEqual(resolveForwardRef(regularFunction), regularFunction)
      assert.strictEqual(resolveForwardRef(regularValue), regularValue)
      assert.strictEqual(resolveForwardRef('string'), 'string')
      assert.strictEqual(resolveForwardRef(123), 123)
      assert.strictEqual(resolveForwardRef(null), null)
      assert.strictEqual(resolveForwardRef(undefined), undefined)
    })

    it('should work with circular references', () => {
      class ServiceA {}
      class ServiceB {}

      const forwardRefA = forwardRef(() => ServiceA)
      const forwardRefB = forwardRef(() => ServiceB)

      // Simulate circular dependency scenario
      const resolvedA = resolveForwardRef(forwardRefA)
      const resolvedB = resolveForwardRef(forwardRefB)

      assert.strictEqual(resolvedA, ServiceA)
      assert.strictEqual(resolvedB, ServiceB)
    })
  })

  describe('integration scenarios', () => {
    it('should work in dependency injection scenarios', () => {
      class DatabaseService {}
      class UserService {
        constructor(public db: any) {}
      }

      // Simulate forward reference in DI container
      const dbForwardRef = forwardRef(() => DatabaseService)
      const userServiceFactory = () => new UserService(resolveForwardRef(dbForwardRef))

      const userService = userServiceFactory()
      assert.strictEqual(userService.db, DatabaseService)
    })

    it('should handle complex forward reference chains', () => {
      class ServiceA {}
      class ServiceB {}
      class ServiceC {}

      const forwardRefA = forwardRef(() => ServiceA)
      const forwardRefB = forwardRef(() => ServiceB)
      const forwardRefC = forwardRef(() => ServiceC)

      const services = [forwardRefA, forwardRefB, forwardRefC]
      const resolved = services.map(resolveForwardRef)

      assert.deepStrictEqual(resolved, [ServiceA, ServiceB, ServiceC])
    })

    it('should work with mixed forward refs and regular values', () => {
      class ServiceA {}
      class ServiceB {}

      const forwardRefA = forwardRef(() => ServiceA)
      const regularB = ServiceB

      const resolvedA = resolveForwardRef(forwardRefA)
      const resolvedB = resolveForwardRef(regularB)

      assert.strictEqual(resolvedA, ServiceA)
      assert.strictEqual(resolvedB, ServiceB)
    })
  })
})

describe('forTest Provider', () => {
  describe('environment-based provider selection', () => {
    it('should return provider options in test environment', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'test'

        const testProvider = { useClass: class MockService {} }
        const result = forTest(testProvider)

        assert.strictEqual(result, testProvider)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return undefined in non-test environments', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'development'

        const testProvider = { useClass: class MockService {} }
        const result = forTest(testProvider)

        assert.strictEqual(result, undefined)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return undefined in production environment', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'production'

        const testProvider = { useClass: class MockService {} }
        const result = forTest(testProvider)

        assert.strictEqual(result, undefined)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should handle different provider types', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'test'

        const classProvider = { useClass: class MockService {} }
        const factoryProvider = { useFactory: () => ({}) }
        const valueProvider = { useValue: { test: 'value' } }

        assert.strictEqual(forTest(classProvider), classProvider)
        assert.strictEqual(forTest(factoryProvider), factoryProvider)
        assert.strictEqual(forTest(valueProvider), valueProvider)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return undefined when NODE_ENV is not set', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        delete process.env.NODE_ENV

        const testProvider = { useClass: class MockService {} }
        const result = forTest(testProvider)

        assert.strictEqual(result, undefined)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  describe('integration with dependency injection', () => {
    it('should work with conditional provider registration', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        // Test environment - should use mock
        process.env.NODE_ENV = 'test'

        class MockService {
          getValue() {
            return 'mock'
          }
        }

        class RealService {
          getValue() {
            return 'real'
          }
        }

        const testProvider = forTest({ useClass: MockService })
        const providers = [testProvider, { useClass: RealService }].filter(Boolean)

        // In test environment, should have both providers
        assert.strictEqual(providers.length, 2)
        assert.strictEqual((providers[0] as any).useClass, MockService)

        // Switch to production
        process.env.NODE_ENV = 'production'

        const prodProvider = forTest({ useClass: MockService })
        const prodProviders = [prodProvider, { useClass: RealService }].filter(Boolean)

        // In production, should only have real service
        assert.strictEqual(prodProviders.length, 1)
        assert.strictEqual((prodProviders[0] as any).useClass, RealService)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })
})
