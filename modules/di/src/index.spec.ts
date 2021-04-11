import t from 'tap'
import 'reflect-metadata'
import { Container, Injector, ReflectiveInjector } from './index.js'

const Injectable = (): ClassDecorator => () =>
  void 'decorator that will cause tsc to emit type metadata'

@Injectable()
class TestA {
  public a = Math.random()
}

class Context {
  scope: Injector = ReflectiveInjector.resolveAndCreate([])
}

const container = new Container({
    contextToken: Context,
    singletons: [TestA],
  }),
  { Service, SingletonService } = container

@SingletonService
class TestC {
  public point = Math.random()
}

@SingletonService()
class TestB {
  constructor(public testA: TestA) {}
}

@Service
class TestD {
  constructor(public testC: TestC, public testB: TestB) {}
}

const context1 = new Context(),
  context2 = new Context(),
  middleware = container.middleware
container.start()
let called = false,
  expectedSingleton: any,
  expectedDifferentInstance: any

middleware(context1, function test() {
  called = true
  t.ok(context1.scope.get(Context) === context1, 'Expected to be able to retrieve current context')

  const testA = context1.scope.get(TestA),
    testC = context1.scope.get(TestC),
    testD = context1.scope.get(TestD)

  expectedSingleton = testC
  expectedDifferentInstance = testD

  t.ok(testA.a === testD.testB.testA.a, 'Expected A to be a singleton')
  t.ok(testD.testC === testC)
})

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
