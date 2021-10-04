import t from 'tap'
import 'reflect-metadata'
import createContainer, {
  Container,
  Injector,
  ReflectiveInjector,
  ContextToken,
  Injectable,
} from './index.js'

t.ok(typeof Injector === 'function')

const mockApp = {
    use: () => void 0,
  },
  noop = () => {
    void 0
  }

t.test('context token', (t) => {
  const container = new Container()
  container.start(mockApp, void 0 as any)
  const context: { scope: Injector } = {} as any
  container.middleware(context, noop)
  t.ok(context.scope.get(ContextToken) === context)
  t.end()
})

t.test('child container', (t) => {
  const container = new Container()
  class Service {
    someProp = 'hello'
  }
  container.serviceCollector.collect(Service)
  container.start(mockApp, void 0 as any)
  const child = container.createChildWithContext({}),
    service = child.get(Service)
  t.equal(service.someProp, 'hello')
  t.end()
})

t.test('init', async (t) => {
  const container = new Container(),
    ctx = {} as any
  container.initContext(ctx)
  t.equal(ctx.scope, null)
  @Injectable()
  class A {}
  @Injectable()
  class B {}
  container.registerProvider(A)
  container.registerSingletonProvider(B)
  t.throws(() => container.get(B))
  await container.start(mockApp, () => Promise.resolve())
  t.ok(container.get(B) instanceof B)
  const child = container.createChildWithContext({})
  t.ok(child.get(A) instanceof A)
  t.throws(() => container.registerProvider(A))
  t.throws(() => container.registerSingletonProvider(B))
})

t.test('DI', (t) => {
  @Injectable()
  class TestA {
    public a = Math.random()
  }

  class Context {
    scope: Injector = ReflectiveInjector.resolveAndCreate([])
  }

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
  const context1 = new Context(),
    context2 = new Context(),
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

  //Should compile
  const testB = container.get(TestB)
  void testB.testA

  middleware(context2, () => {
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

  t.ok(called)
  t.end()
})
