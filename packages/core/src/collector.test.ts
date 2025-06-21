import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Ingress } from './core.js'
import { forTest } from './di.js'
import type { NextFn } from './compose.js'

describe('Dependency Injection Collectors', () => {
  describe('UseSingleton Decorator', () => {
    it('should execute lifecycle methods correctly', async () => {
      const app = new Ingress()
      const { UseSingleton } = app.container
      let lifecycleCallCount = 0

      @UseSingleton
      class TestSingletonService {
        start() {
          lifecycleCallCount++
        }

        middleware(_context: any, next: any) {
          lifecycleCallCount++
          return next()
        }

        stop(app: any) {
          assert.strictEqual(this, app.container.get(TestSingletonService))
          lifecycleCallCount++
        }
      }

      await app.start()
      assert.strictEqual(lifecycleCallCount, 1, 'start() should be called once')

      await app.middleware()
      await app.middleware()
      assert.strictEqual(lifecycleCallCount, 3, 'middleware() should be called twice')

      await app.stop()
      assert.strictEqual(lifecycleCallCount, 4, 'stop() should be called once')
    })

    it('should respect priority ordering with before constraint', async () => {
      const app = new Ingress()
      const { UseSingleton } = app.container
      let executionOrder = ''

      class BaseMiddleware {
        middleware(_: any, next: NextFn) {
          executionOrder += 'last'
          return next()
        }
      }
      app.use(new BaseMiddleware())

      @UseSingleton({ priority: { before: BaseMiddleware } })
      class HighPriorityService {
        middleware(_context: any, next: any) {
          executionOrder += 'first'
          return next()
        }
      }

      await app.start()
      await app.middleware()
      await app.stop()

      assert.strictEqual(executionOrder, 'firstlast', 'Services should execute in priority order')
    })

    it('should respect complex priority ordering with multiple constraints', async () => {
      const app = new Ingress()
      const { UseSingleton } = app.container
      let executionOrder = ''

      class BaseMiddleware {
        middleware(_: any, next: NextFn) {
          executionOrder += 'd'
          return next()
        }
      }
      app.use(new BaseMiddleware())

      @UseSingleton({ priority: { before: BaseMiddleware } })
      class ThirdPriorityService {
        middleware(_context: any, next: any) {
          executionOrder += 'c'
          return next()
        }
      }

      @UseSingleton({ priority: { before: ThirdPriorityService } })
      class FirstPriorityService {
        middleware(_context: any, next: any) {
          executionOrder += 'a'
          return next()
        }
      }

      @UseSingleton({ priority: { after: FirstPriorityService } })
      class SecondPriorityService {
        middleware(_context: any, next: any) {
          executionOrder += 'b'
          return next()
        }
      }

      await app.start()
      await app.middleware()
      await app.stop()

      assert.strictEqual(executionOrder, 'abcd', 'Services should execute in correct priority order')
    })
  })

  describe('SingletonService Decorator', () => {
    it('should return the same instance across multiple requests', async () => {
      const app = new Ingress()
      const { SingletonService } = app.container

      @SingletonService
      class TestSingletonService {}

      let previousInstance: TestSingletonService | null = null
      let instanceCheckCount = 0

      app.use({
        middleware(context: any, next: any) {
          const currentInstance = context.scope.get(TestSingletonService)

          if (previousInstance) {
            assert.strictEqual(currentInstance, previousInstance, 'Singleton should return the same instance')
          }

          previousInstance = currentInstance
          instanceCheckCount++
          return next()
        },
      })

      await app.run()
      await app.middleware()
      await app.middleware()
      await app.stop()

      assert.strictEqual(instanceCheckCount, 2, 'Middleware should have been called twice')
    })
  })

  describe('Service Decorator', () => {
    it('should create new instances for each request', async () => {
      const app = new Ingress()
      const { Service } = app.container

      @Service
      class TestService {}

      let previousInstance: TestService | null = null
      let instanceCheckCount = 0

      app.use({
        middleware(context: any, next: any) {
          const currentInstance = context.scope.get(TestService)

          if (previousInstance) {
            assert.notStrictEqual(
              currentInstance,
              previousInstance,
              'Service should create new instances for each request',
            )
            assert.strictEqual(
              previousInstance instanceof TestService,
              true,
              'Previous instance should be of correct type',
            )
            assert.strictEqual(
              currentInstance instanceof TestService,
              true,
              'Current instance should be of correct type',
            )
          }

          previousInstance = currentInstance
          instanceCheckCount++
          return next()
        },
      })

      await app.run()
      await app.middleware()
      await app.middleware()
      await app.stop()

      assert.strictEqual(instanceCheckCount, 2, 'Middleware should have been called twice')
    })
  })

  describe('forTest Provider', () => {
    it('should use real implementation in development environment', async () => {
      const app = new Ingress()
      const { Service } = app.container

      class MockTestService {
        message = 'mock implementation'
      }

      process.env.NODE_ENV = 'development'

      @Service(forTest({ useClass: MockTestService }))
      class RealTestService {
        message = 'real implementation'
      }

      let middlewareCallCount = 0

      app.use({
        middleware(context: any, next: any) {
          const serviceInstance = context.scope.get(RealTestService)
          assert.deepEqual(
            serviceInstance,
            { message: 'real implementation' },
            'Should use real implementation in development',
          )
          middlewareCallCount++
          return next()
        },
      })

      await app.run()
      await app.middleware()
      await app.stop()

      assert.strictEqual(middlewareCallCount, 1, 'Middleware should have been called once')
    })

    it('should use mock implementation in test environment', async () => {
      const app = new Ingress()

      class MockTestService {
        message = 'mock implementation'
      }

      const createTestProvider = () => {
        process.env.NODE_ENV = 'test'
        return forTest({ useClass: MockTestService })
      }

      @app.container.Service(createTestProvider())
      class RealTestService {
        message = 'real implementation'
      }

      let middlewareCallCount = 0

      app.use({
        middleware(context: any, next: any) {
          const serviceInstance = context.scope.get(RealTestService)
          assert.deepEqual(
            serviceInstance,
            { message: 'mock implementation' },
            'Should use mock implementation in test environment',
          )
          middlewareCallCount++
          return next()
        },
      })

      await app.run()
      await app.middleware()
      await app.stop()

      assert.strictEqual(middlewareCallCount, 1, 'Middleware should have been called once')
    })
  })
})
