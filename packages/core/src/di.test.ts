import { describe, it } from 'node:test'
import assert from 'node:assert'
import 'reflect-metadata'
import {
  ModuleContainer,
  InjectionToken,
  ContextToken,
  createContainer,
  Injectable,
  DependencyCollectorList,
} from './di.js'

describe('Dependency Injection System', () => {
  describe('ModuleContainer', () => {
    describe('singleton provider management', () => {
      it('should find provided singleton by injection token', () => {
        const container = new ModuleContainer()
        const singletonValue = { test: 'value' }
        const token = new InjectionToken('test-singleton')

        container.registerSingleton({ useValue: singletonValue, provide: token })

        const foundSingleton = container.findProvidedSingleton(token)
        assert.strictEqual(foundSingleton, singletonValue)
      })

      it('should find provided singleton by class type', () => {
        class TestService {}
        const container = new ModuleContainer()
        const serviceInstance = new TestService()

        container.registerSingleton({ useValue: serviceInstance, provide: TestService })

        const foundSingleton = container.findProvidedSingleton(TestService)
        assert.strictEqual(foundSingleton, serviceInstance)
      })

      it('should return undefined for non-existent singleton', () => {
        const container = new ModuleContainer()
        const token = new InjectionToken('non-existent')

        const foundSingleton = container.findProvidedSingleton(token)
        assert.strictEqual(foundSingleton, undefined)
      })

      it('should register class-based singletons', () => {
        class TestService {}
        const container = new ModuleContainer()

        container.registerSingleton(TestService)
        container.setup()

        const instance = container.get(TestService)
        assert.strictEqual(instance instanceof TestService, true)
      })

      it('should register factory-based singletons', () => {
        class TestService {}
        const container = new ModuleContainer()
        const factoryResult = { fromFactory: true }

        container.registerSingleton({
          provide: TestService,
          useFactory: () => factoryResult,
        })
        container.setup()

        const instance = container.get(TestService)
        assert.strictEqual(instance, factoryResult)
      })

      it('should register value-based singletons', () => {
        const token = new InjectionToken('test-value')
        const container = new ModuleContainer()
        const testValue = 'test-string'

        container.registerSingleton({
          provide: token,
          useValue: testValue,
        })
        container.setup()

        const value = container.get(token)
        assert.strictEqual(value, testValue)
      })
    })

    describe('scoped service management', () => {
      it('should register and resolve scoped services', () => {
        class ScopedService {}
        const container = new ModuleContainer()

        container.registerScoped(ScopedService)
        container.setup()

        const context = { test: 'context' }
        const childInjector = container.createChildWithContext(context)

        const instance = childInjector.get(ScopedService)
        assert.strictEqual(instance instanceof ScopedService, true)
      })

      it('should create different instances for different scopes', () => {
        class ScopedService {}
        const container = new ModuleContainer()

        container.registerScoped(ScopedService)
        container.setup()

        const context1 = { id: 1 }
        const context2 = { id: 2 }
        const child1 = container.createChildWithContext(context1)
        const child2 = container.createChildWithContext(context2)

        const instance1 = child1.get(ScopedService)
        const instance2 = child2.get(ScopedService)

        assert.strictEqual(instance1 instanceof ScopedService, true)
        assert.strictEqual(instance2 instanceof ScopedService, true)
        assert.notStrictEqual(instance1, instance2)
      })

      it('should provide access to context through ContextToken', () => {
        const container = new ModuleContainer()
        container.setup()

        const testContext = { userId: 123, requestId: 'abc' }
        const childInjector = container.createChildWithContext(testContext)

        const retrievedContext = childInjector.get(ContextToken)
        assert.strictEqual(retrievedContext, testContext)
      })
    })

    describe('container lifecycle and state management', () => {
      it('should prevent registration after container is started', () => {
        class TestService {}
        const container = new ModuleContainer()

        container.setup() // This creates the root injector

        assert.throws(
          () => container.registerSingleton(TestService),
          /Cannot register provider on existing container/,
        )

        assert.throws(
          () => container.registerScoped(TestService),
          /Cannot register provider on existing container/,
        )
      })

      it('should throw when trying to get scoped service from root container', () => {
        class ScopedService {}
        const container = new ModuleContainer()

        container.registerScoped(ScopedService)
        container.setup()

        assert.throws(() => container.get(ScopedService))
      })

      it('should share singleton instances between root and child containers', () => {
        class SingletonService {}
        class ScopedService {}
        const container = new ModuleContainer()

        container.registerSingleton(SingletonService)
        container.registerScoped(ScopedService)
        container.setup()

        const context = { test: 'context' }
        const childInjector = container.createChildWithContext(context)

        const rootSingleton = container.get(SingletonService)
        const childSingleton = childInjector.get(SingletonService)

        assert.strictEqual(rootSingleton, childSingleton)
      })
    })

    describe('container initialization options', () => {
      it('should accept pre-configured singletons and services', () => {
        class PreConfiguredSingleton {}
        class PreConfiguredService {}

        const container = new ModuleContainer({
          singletons: [PreConfiguredSingleton],
          services: [PreConfiguredService],
        })

        container.setup()

        const singletonInstance = container.get(PreConfiguredSingleton)
        assert.strictEqual(singletonInstance instanceof PreConfiguredSingleton, true)

        const context = {}
        const childInjector = container.createChildWithContext(context)
        const serviceInstance = childInjector.get(PreConfiguredService)
        assert.strictEqual(serviceInstance instanceof PreConfiguredService, true)
      })

      it('should accept custom context token', () => {
        const customContextToken = new InjectionToken('custom-context')
        const container = new ModuleContainer({
          contextToken: customContextToken,
        })

        container.setup()

        const testContext = { custom: 'data' }
        const childInjector = container.createChildWithContext(testContext)

        const retrievedContext = childInjector.get(customContextToken)
        assert.strictEqual(retrievedContext, testContext)
      })
    })

    describe('container integration with app lifecycle', () => {
      it('should handle start lifecycle with app integration', async () => {
        const container = new ModuleContainer()
        let startCalled = false

        const mockApp = {
          container: new ModuleContainer(),
          unUse: () => {},
          finalize: () => {
            startCalled = true
            return Promise.resolve()
          },
        }

        const result = await container.start(mockApp, async () => {})
        assert.strictEqual(startCalled, true)
      })

      it('should setup container when no app container exists', async () => {
        const container = new ModuleContainer()
        class TestService {}
        container.registerSingleton(TestService)

        await container.start()

        // Should be able to get services after start
        const instance = container.get(TestService)
        assert.strictEqual(instance instanceof TestService, true)
      })

      it('should initialize context correctly', () => {
        const container = new ModuleContainer()
        container.setup()

        const context: any = { existing: 'data' }
        const initializedContext = container.initializeContext(context)

        assert.strictEqual(initializedContext, context)
        assert.strictEqual(typeof initializedContext.scope, 'object')
        assert.strictEqual(initializedContext.scope.get(ContextToken), context)
      })
    })
  })

  describe('DependencyCollectorList', () => {
    describe('basic collection functionality', () => {
      it('should collect classes without options', () => {
        const collector = new DependencyCollectorList()

        class TestService {}
        collector.collect(TestService)

        assert.strictEqual(collector.items.has(TestService), true)
        assert.strictEqual(collector.items.size, 1)
      })

      it('should clear collected items', () => {
        const collector = new DependencyCollectorList()

        class TestService {}
        collector.collect(TestService)
        assert.strictEqual(collector.items.size, 1)

        collector.clear()
        assert.strictEqual(collector.items.size, 0)
      })

      it('should return collector function when called without arguments', () => {
        const collector = new DependencyCollectorList()
        const returned = collector.collect()

        assert.strictEqual(returned, collector.collect)
      })
    })

    describe('priority-based collection', () => {
      it('should handle priority options', () => {
        const collector = new DependencyCollectorList()

        class BaseService {}
        class PriorityService {}

        const priorityDecorator = collector.collect({ priority: { before: BaseService } })
        priorityDecorator(PriorityService)

        assert.strictEqual(collector.items.has(PriorityService), true)

        const priority = DependencyCollectorList.priorities.get(PriorityService)
        assert.deepStrictEqual(priority, { priority: { before: BaseService } })
      })
    })

    describe('provider-based collection', () => {
      it('should handle provide options', () => {
        const collector = new DependencyCollectorList()
        const token = new InjectionToken('test-token')

        class TestService {}

        const provideDecorator = collector.collect({ provide: token })
        provideDecorator(TestService)

        // Should collect a provider object, not the class directly
        const collectedItems = Array.from(collector.items)
        assert.strictEqual(collectedItems.length, 1)

        const provider = collectedItems[0] as any
        assert.strictEqual(provider.provide, token)
        assert.strictEqual(provider.useClass, TestService)
      })

      it('should handle factory providers', () => {
        const collector = new DependencyCollectorList()
        const factoryFn = () => ({ test: 'value' })

        class TestService {}

        const factoryDecorator = collector.collect({ useFactory: factoryFn })
        factoryDecorator(TestService)

        const collectedItems = Array.from(collector.items)
        const provider = collectedItems[0] as any
        assert.strictEqual(provider.provide, TestService)
        assert.strictEqual(provider.useFactory, factoryFn)
      })

      it('should handle value providers', () => {
        const collector = new DependencyCollectorList()
        const testValue = { test: 'value' }

        class TestToken {}

        const valueDecorator = collector.collect({ useValue: testValue })
        valueDecorator(TestToken)

        const collectedItems = Array.from(collector.items)
        const provider = collectedItems[0] as any
        assert.strictEqual(provider.provide, TestToken)
        assert.strictEqual(provider.useValue, testValue)
      })

      it('should handle class providers', () => {
        const collector = new DependencyCollectorList()

        class ImplementationService {}
        class InterfaceService {}

        const classDecorator = collector.collect({ useClass: ImplementationService })
        classDecorator(InterfaceService)

        const collectedItems = Array.from(collector.items)
        const provider = collectedItems[0] as any
        assert.strictEqual(provider.provide, InterfaceService)
        assert.strictEqual(provider.useClass, ImplementationService)
      })
    })
  })

  describe('createContainer factory function', () => {
    it('should create a new ModuleContainer with default options', () => {
      const container = createContainer()

      assert.strictEqual(container instanceof ModuleContainer, true)
      assert.strictEqual(Array.isArray(container.singletons), true)
      assert.strictEqual(Array.isArray(container.services), true)
    })

    it('should create a container with provided options', () => {
      class PreConfiguredService {}
      const options = {
        singletons: [PreConfiguredService],
        services: [],
      }

      const container = createContainer(options)

      assert.strictEqual(container.singletons.includes(PreConfiguredService), true)
    })
  })

  describe('InjectionToken', () => {
    it('should create unique tokens with descriptive names', () => {
      const token1 = new InjectionToken('service-1')
      const token2 = new InjectionToken('service-2')
      const token3 = new InjectionToken('service-1') // Same name, different instance

      assert.notStrictEqual(token1, token2)
      assert.notStrictEqual(token1, token3)
      assert.strictEqual(token1.toString(), 'InjectionToken service-1')
    })

    it('should work as provider keys', () => {
      const token = new InjectionToken<string>('test-string')
      const container = new ModuleContainer()

      container.registerSingleton({
        provide: token,
        useValue: 'test-value',
      })
      container.setup()

      const value = container.get(token)
      assert.strictEqual(value, 'test-value')
    })
  })

  describe('integration scenarios', () => {
    it('should handle complex dependency graphs', () => {
      class DatabaseService {}
      class LoggerService {}
      class UserService {}

      const container = new ModuleContainer()

      // Register dependencies
      container.registerSingleton(DatabaseService)
      container.registerSingleton(LoggerService)
      container.registerScoped(UserService)

      container.setup()

      const context = { userId: 123 }
      const childInjector = container.createChildWithContext(context)

      // All services should be resolvable
      const dbService = childInjector.get(DatabaseService)
      const loggerService = childInjector.get(LoggerService)
      const userService = childInjector.get(UserService)

      assert.strictEqual(dbService instanceof DatabaseService, true)
      assert.strictEqual(loggerService instanceof LoggerService, true)
      assert.strictEqual(userService instanceof UserService, true)

      // Singletons should be shared
      assert.strictEqual(dbService, container.get(DatabaseService))
      assert.strictEqual(loggerService, container.get(LoggerService))
    })

    it('should handle mixed provider types in same container', () => {
      class ClassBasedService {}
      const factoryToken = new InjectionToken('factory-service')
      const valueToken = new InjectionToken('value-service')

      const container = new ModuleContainer()

      container.registerSingleton(ClassBasedService)
      container.registerSingleton({
        provide: factoryToken,
        useFactory: () => ({ type: 'factory' }),
      })
      container.registerSingleton({
        provide: valueToken,
        useValue: { type: 'value' },
      })

      container.setup()

      const classInstance = container.get(ClassBasedService)
      const factoryInstance = container.get(factoryToken)
      const valueInstance = container.get(valueToken)

      assert.strictEqual(classInstance instanceof ClassBasedService, true)
      assert.deepStrictEqual(factoryInstance, { type: 'factory' })
      assert.deepStrictEqual(valueInstance, { type: 'value' })
    })
  })
})
