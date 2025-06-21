import 'reflect-metadata'
import { describe, it } from 'node:test'
import assert from 'node:assert'

import type { CoreContext } from './di.js'
import { createContainer, ModuleContainer, Injectable } from './di.js'
import { createAnnotationFactory } from 'reflect-annotations'
import type { Middleware } from './core.js'
import { Ingress, AppState, ingress } from './core.js'
import type { Startable, Stoppable, UsableMiddleware } from './types.js'
import type { NextFn } from './compose.js'

describe('Ingress Core', () => {
  describe('usable composition and middleware', () => {
    it('should compose multiple usables with start/stop/middleware lifecycle', async () => {
      let executionPlan = 20
      const assertAndDecrement = (actual: any, expected: any) => {
        assert.deepStrictEqual(actual, expected)
        executionPlan--
      }

      type TestContext = { scope: any; value: string }
      let capturedContext!: TestContext

      class ContextThing {
        scope: any
        value = ''
      }

      const app1 = new Ingress<TestContext>({ context: new ContextThing() })
      const app2 = ingress<TestContext>()
      const app3 = new Ingress<TestContext>()
      const app = Object.assign(app1, { value: '' })

      const plainUsable = {
        async start(appInstance: any, next: NextFn) {
          assertAndDecrement(app, appInstance)
          app.value += '1'
          await next()
          app.value += '6'
        },
        async stop(appInstance: any, next: NextFn) {
          assertAndDecrement(app, appInstance)
          stopValue += '1'
          await next()
          stopValue += '6'
        },
        async middleware(context: any, next: NextFn) {
          capturedContext = context
          context.value += '1'
          assert.strictEqual(context instanceof ContextThing, true)
          executionPlan--
          await next()
          context.value += '6'
        },
      }

      const annotationUsable = createAnnotationFactory(
        class implements Startable, Stoppable, UsableMiddleware<any> {
          async start(appInstance: any, next: NextFn) {
            app.value += '2'
            assertAndDecrement(app, appInstance)
            await next()
            app.value += '5'
          }
          async stop(appInstance: any, next: NextFn) {
            assertAndDecrement(app, appInstance)
            stopValue += '2'
            await next()
            stopValue += '5'
          }
          async middleware(context: any, next: NextFn) {
            context.value += '2'
            assert.strictEqual(context instanceof ContextThing, true)
            executionPlan--
            await next()
            context.value += '5'
          }
        },
      )()

      class ClassBasedUsable {
        async start(appInstance: TestContext, next: NextFn) {
          assertAndDecrement(app, appInstance)
          app.value += '3'
          await next()
          app.value += '4'
          return { hi: 'hello' }
        }
        async stop(appInstance: any, next: NextFn) {
          assertAndDecrement(app, appInstance)
          stopValue += '3'
          await next()
          stopValue += '4'
        }
        async middleware(context: TestContext, next: NextFn) {
          context.value += '3'
          assert.strictEqual(context instanceof ContextThing, true)
          executionPlan--
          await next()
          context.value += '4'
        }
      }

      const classUsableFactory = createAnnotationFactory(ClassBasedUsable)
      let stopValue = ''

      // Setup app composition
      app1.use(plainUsable).use(annotationUsable)
      app3.use(classUsableFactory)
      app2.use(app3)
      app1.use(app2)

      // Test start lifecycle
      await app1.start()
      assertAndDecrement(app.value, '123456')
      assertAndDecrement(stopValue, '')

      // Test middleware execution
      const middleware = app.middleware
      await middleware()
      assertAndDecrement(middleware, app.middleware) // Should be cached
      assertAndDecrement(app.value, '123456')
      assertAndDecrement(capturedContext.value, '123456')
      assertAndDecrement(stopValue, '')

      // Test stop lifecycle
      await app.stop()
      assertAndDecrement(app.value, '123456')
      assertAndDecrement(capturedContext.value, '123456')
      assertAndDecrement(stopValue, '123456')

      // Test container sharing
      assertAndDecrement(app1.container, app2.container)
      assertAndDecrement(app2.container, app3.container)
      assert.strictEqual(executionPlan, 0)
    })

    it('should merge base containers correctly', async () => {
      const container1 = Object.assign(createContainer(), { NAME: 1 })
      const container2 = Object.assign(createContainer(), { NAME: 2 })

      @container1.SingletonService()
      class Service1 {}

      @container2.SingletonService
      class Service2 {}

      const app = new Ingress({ container: container1 as any })
      app.use(container2)
      app.use((context: any, next: any) => {
        assert.strictEqual(context.scope.get(Service2) instanceof Service2, true)
        assert.strictEqual(context.scope.get(Service1) instanceof Service1, true)
        return next()
      })

      await app.start()
      await app.middleware()
    })

    it('should merge module containers with proper service lifecycles', async () => {
      const app = new Ingress()
      const moduleContainer = new ModuleContainer()

      @app.container.SingletonService
      class SingletonServiceA {}

      @moduleContainer.SingletonService({
        useFactory() {
          return 'factory-result'
        },
      })
      class FactoryService {}

      @moduleContainer.Service
      class ScopedService {}

      app.use(moduleContainer)

      let singletonA: SingletonServiceA
      let factoryService: FactoryService
      let scopedService: ScopedService

      const testMiddleware: Middleware<any> = (context, next) => {
        if (scopedService) {
          // Scoped services should be different instances
          assert.deepStrictEqual(scopedService, context.scope.get(ScopedService))
          assert.notStrictEqual(scopedService, context.scope.get(ScopedService))
        }

        singletonA ||= context.scope.get(SingletonServiceA)
        factoryService ||= context.scope.get(FactoryService)
        scopedService ||= context.scope.get(ScopedService)

        assert.strictEqual(singletonA instanceof SingletonServiceA, true)
        assert.strictEqual(factoryService, 'factory-result')
        assert.strictEqual(scopedService instanceof ScopedService, true)

        // Singletons should be the same instance
        assert.deepStrictEqual(singletonA, context.scope.get(SingletonServiceA))
        assert.deepStrictEqual('factory-result', context.scope.get(FactoryService))

        return next()
      }

      app.use(testMiddleware)
      await app.start()
      await app.middleware()
      await app.middleware()
      await app.stop()
    })
  })

  describe('middleware validation', () => {
    it('should reject middleware with incorrect arity', async () => {
      const app = new Ingress()

      assert.throws(() => {
        app.use((context: any) => {
          void context
        })
      }, /Middleware must accept two arguments, context and next/)

      assert.throws(() => {
        app.use({
          middleware() {
            void 0
          },
        })
      }, /Middleware must accept two arguments, context and next/)

      assert.throws(() => {
        app.use({} as any)
      }, /Unable to use: \[object Object\]/)
    })
  })

  describe('addon lifecycle management', () => {
    it('should support nested unUse operations during start', async () => {
      let executionPlan = 0
      const parentApp = new Ingress()
      const childApp = new Ingress()

      parentApp.use({
        start() {
          return Promise.resolve()
        },
        middleware(_context: any, next: any) {
          executionPlan++
          return next()
        },
      })

      childApp.use({
        start(app: any, next: any) {
          app.unUse(this)
          assert.throws(() => app.unUse(this), /Unable to unUse an addon that has not been use'd/)
          executionPlan++
          return next()
        },
        middleware(_context: any, next: any) {
          executionPlan++
          assert.strictEqual(true, false, 'This middleware should not execute after unUse')
          return next()
        },
      })

      parentApp.use(childApp)
      await parentApp.start()
      await parentApp.middleware()
      await parentApp.stop()

      assert.deepStrictEqual(executionPlan, 2)
    })
  })

  describe('context initialization', () => {
    it('should use null prototype context by default', async () => {
      let executionPlan = 0
      const app = new Ingress()

      app.use((context: { wat: boolean }, next: any) => {
        executionPlan++
        assert.deepStrictEqual(Object.getPrototypeOf(context), null)
        return next()
      })

      await app.start()
      await app.middleware()
      assert.deepStrictEqual(1, executionPlan)
    })
  })

  describe('application state management', () => {
    it('should prevent operations on already started or stopped apps', async () => {
      const app = new Ingress()
      app.use({ middleware: (_context: any, next: any) => next() })

      await app.start()

      // Should reject starting an already started app
      await app.start().catch((error) => assert.deepStrictEqual(error.message, 'Already started or starting'))

      // Should reject using addons after start
      assert.throws(
        () =>
          app.use({
            start(_: any, next: NextFn) {
              return next()
            },
          }),
        /Already started, Cannot "use" now/,
      )

      await app.stop()

      // Should reject stopping an already stopped app
      await app.stop().catch((error) => assert.deepStrictEqual(error.message, 'Already stopped or stopping'))
    })

    it('should handle driver registration and app running', async () => {
      const app = new Ingress()
      const driverHandle = Symbol('test-driver')

      app.registerDriver(driverHandle, async () => {
        assert.strictEqual(!!(app.readyState & AppState.Started), true)
        await Promise.resolve()
        assert.strictEqual(!!(app.readyState & AppState.Started), true)
      })

      // Should reject duplicate driver registration
      assert.throws(() => {
        app.registerDriver(driverHandle, () => {
          void 0
        })
      }, /Driver already registered/)

      assert.strictEqual(app.readyState === AppState.New, true)

      const startingPromise = app.start()
      assert.strictEqual(!!(app.readyState & AppState.Starting), true)

      await startingPromise
      assert.deepStrictEqual(app.driver, driverHandle)
      assert.strictEqual(!!(app.readyState & AppState.Started), true)

      await app.run()
      assert.strictEqual(!!(app.readyState & AppState.Running), true)
    })

    it('should prevent running stopped apps', async () => {
      const app = new Ingress()
      await app.run()
      await app.stop()

      try {
        await app.run()
        throw new Error('should have thrown')
      } catch (error: any) {
        assert.strictEqual(error.message, 'Cannot run a stopped app')
      }
    })
  })

  describe('dependency injection', () => {
    it('should handle scoped and singleton services correctly', async () => {
      @Injectable()
      class ScopedService {}

      @Injectable()
      class SingletonService {}

      const scopedInstances: ScopedService[] = []
      const singletonInstances: SingletonService[] = []
      const app = new Ingress()

      app.use({
        start(appInstance: any, next: NextFn) {
          appInstance.container.registerScoped(ScopedService)
          appInstance.container.registerSingleton(SingletonService)
          return next()
        },
        middleware(context: any, next: NextFn) {
          scopedInstances.push(context.scope.get(ScopedService))
          singletonInstances.push(context.scope.get(SingletonService))
          return next()
        },
      })

      assert.strictEqual(app.readyState === AppState.New, true)
      await app.start()
      assert.strictEqual(!!(app.readyState & AppState.Running), true)

      await app.middleware()
      await app.middleware()

      // Scoped services should be different instances
      assert.deepStrictEqual(scopedInstances.length, 2)
      assert.strictEqual(scopedInstances[0] instanceof ScopedService, true)
      assert.strictEqual(scopedInstances[1] instanceof ScopedService, true)
      assert.strictEqual(scopedInstances[0] !== scopedInstances[1], true)

      // Singleton services should be the same instance
      assert.strictEqual(singletonInstances[0] instanceof SingletonService, true)
      assert.strictEqual(singletonInstances[1] instanceof SingletonService, true)
      assert.deepStrictEqual(singletonInstances[0], singletonInstances[1])
    })

    it('should work with passed module containers', async () => {
      @Injectable()
      class ScopedService {}

      @Injectable()
      class SingletonService {}

      const container = new ModuleContainer()
      container.registerScoped(ScopedService)
      container.registerSingleton(SingletonService)

      const scopedInstances: ScopedService[] = []
      const singletonInstances: SingletonService[] = []
      const app = new Ingress({ container })

      app.use((context: any, next: any) => {
        scopedInstances.push(context.scope.get(ScopedService))
        singletonInstances.push(context.scope.get(SingletonService))
        return next()
      })

      await app.start()
      await app.middleware()
      await app.middleware()

      // Scoped services should be different instances
      assert.strictEqual(scopedInstances[0] instanceof ScopedService, true)
      assert.strictEqual(scopedInstances[1] instanceof ScopedService, true)
      assert.strictEqual(scopedInstances[0] !== scopedInstances[1], true)

      // Singleton services should be the same instance
      assert.strictEqual(singletonInstances[0] instanceof SingletonService, true)
      assert.strictEqual(singletonInstances[1] instanceof SingletonService, true)
      assert.deepStrictEqual(singletonInstances[0], singletonInstances[1])
    })
  })

  describe('decorations and extensions', () => {
    it('should support context initialization and app decorations', async () => {
      const app = new Ingress()

      class ContextExtender {
        initializeContext(context: CoreContext) {
          return Object.assign(context, { customProperty: 'test-value' })
        }

        async start(_app: Ingress<ReturnType<(typeof this)['initializeContext']>>, next: NextFn) {
          await next()
          return {
            decorationProperty: 'decoration-value',
          }
        }
      }

      const annotationFactory = createAnnotationFactory(ContextExtender)
      const annotation = annotationFactory()
      const factoryApp = new Ingress()
      factoryApp.use(annotation)

      const extendedApp = app.use(new ContextExtender())
      const finalApp = extendedApp.use((context, next) => {
        void context.customProperty // Should be available due to context extension
        return next()
      })

      const startedApp = await finalApp.start()
      assert.strictEqual(startedApp.decorationProperty, 'decoration-value')
    })

    it('should support custom driver with typed context', () => {
      type CustomContext = CoreContext & { customProperty: 'test' }

      class CustomUsable {
        initializeContext(context: CustomContext) {
          return context
        }

        start(_app: Ingress<CustomContext>, next: NextFn) {
          return next()
        }

        middleware(_context: CustomContext, next: NextFn) {
          return next()
        }
      }

      const app = new Ingress()
      const result = app.use(new CustomUsable())
      result.use((ctx, next) => {
        void ctx.customProperty // Should compile without type errors
      })
    })
  })
})
