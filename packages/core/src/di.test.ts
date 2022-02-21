import { test } from 'uvu'
import * as t from 'uvu/assert'
import 'reflect-metadata'
import createContainer, { ModuleContainer, Injector, ContextToken, Injectable } from './index.js'

t.ok(typeof Injectable === 'function')

const mockApp = {
    use: () => void 0,
  },
  noop = () => {
    void 0
  }

test('context token', () => {
  const container = new ModuleContainer()
  container.start(mockApp, void 0 as any)
  const context: { scope: Injector } = {} as any
  container.middleware(context, noop)
  t.ok(context.scope.get(ContextToken) === context)
})

test('child container', () => {
  const container = new ModuleContainer()
  class Service {
    someProp = 'hello'
  }
  container.serviceCollector.collect(Service)
  container.start(mockApp, void 0 as any)
  const child = container.createChildWithContext({}),
    service = child.get(Service)
  t.equal(service.someProp, 'hello')
})

test('init', async () => {
  const container = new ModuleContainer(),
    ctx = {} as any
  container.initContext(ctx)
  t.equal(ctx.scope, null)
  @Injectable()
  class A {}
  @Injectable()
  class B {}
  container.registerScoped(A)
  container.registerSingleton(B)
  t.throws(() => container.get(B))
  await container.start(mockApp, () => Promise.resolve())
  t.ok(container.get(B) instanceof B)
  const child = container.createChildWithContext({})
  t.ok(child.get(A) instanceof A)
  t.throws(() => container.registerScoped(A))
  t.throws(() => container.registerSingleton(B))
})

test('DI', () => {
  @Injectable()
  class TestA {
    public a = Math.random()
  }

  class Context {}

  const container = createContainer({
      contextToken: Context,
      singletons: [TestA],
    }),
    { Service, SingletonService, UseSingleton } = container

  @SingletonService
  class TestC {
    public point = Math.random()
  }

  @SingletonService({
    deps: [TestC],
    useFactory(c: TestC) {
      return { c }
    },
  })
  class FactoryToken {}

  @UseSingleton
  class SomeSingletonService {}
  @SingletonService()
  class TestB {
    constructor(public testA: TestA) {}
  }

  @Service
  class TestD {
    constructor(public testC: TestC, public testB: TestB) {}
  }
  let singletonUsed = false
  const context1 = new Context() as { scope: Injector },
    context2 = new Context() as { scope: Injector },
    middleware = container.middleware
  container.start(
    {
      use: (a: any) => {
        singletonUsed = true
        t.ok(a instanceof SomeSingletonService, 'a is registered on the app')
      },
    },
    void 0 as any
  )
  let called = false,
    expectedSingleton: any,
    expectedDifferentInstance: any

  t.ok(singletonUsed, 'singleton used')

  middleware(context1, function test() {
    called = true
    t.ok(
      context1.scope.get(Context) === context1,
      'Expected to be able to retrieve current context'
    )

    const testA = context1.scope.get(TestA),
      testC = context1.scope.get(TestC),
      testD = context1.scope.get(TestD)

    expectedSingleton = testC
    expectedDifferentInstance = testD

    t.ok(testA.a === testD.testB.testA.a, 'Expected A to be a singleton')
    t.ok(testD.testC === testC)
  })

  const fact = container.get(FactoryToken) as any,
    c = container.get(TestC)
  t.equal(fact.c, c)

  const testB = container.get(TestB)
  t.ok(testB instanceof TestB)
  t.ok(testB.testA instanceof TestA)
  let called2 = false

  middleware(context2, () => {
    called2 = true
    t.ok(context2.scope !== context1.scope, 'Expected subsequent contexts to not be equal')

    t.ok(expectedSingleton === context2.scope.get(TestC), 'Expected TestC to be a singleton')

    t.ok(
      context2.scope.get(TestD) !== expectedDifferentInstance,
      'Expected TestD to be unique per context'
    )

    t.ok(
      context2.scope.get(Context) === context2,
      'Expected context to retrieve active context token'
    )
  })

  t.ok(called && called2)
})

test.run()
