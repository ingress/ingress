import t from 'tap'
import { Route } from './annotations/route.annotation.js'
import { mockContext } from './context.util.test.js'
import { Router } from './router.js'

t.test('no registered type converter', async (t) => {
  t.plan(1)
  class Routes {
    @Route.Get('/:a')
    someRoute(@Route.Path('a') a: any) {
      void a
    }
  }
  const router = new Router({ controllers: [Routes] })
  try {
    await router.start()
  } catch (e) {
    t.equal(e.message, 'No type converter found for: Routes.someRoute at argument 0:Object')
  }
  t.end()
})

t.test('registered type resolver', async (t) => {
  t.plan(1)
  class Routes {
    @Route.Get('/:a')
    someRoute(@Route.Path('a') a: any) {
      t.equal(a, 'hello world')
    }
  }
  const router = new Router({ controllers: [Routes] })
  router.registerTypeResolver(Object, (x) => x + ' world')
  await router.start()
  await router.middleware(mockContext('/hello', 'GET', {}, Routes), () => t.end())
})

t.test('registered type predicate resolver', async (t) => {
  t.plan(1)
  class Routes {
    @Route.Get('/:a')
    someRoute(@Route.Path('a') a: any) {
      t.equal(a, 'hello world')
    }
  }
  const router = new Router({ controllers: [Routes] })
  router.registerTypePredicateResolver(
    (_x) => false,
    (x) => x
  )
  router.registerTypePredicateResolver(
    (x) => x === Object,
    (x) => x + ' world'
  )
  await router.start()
  await router.middleware(mockContext('/hello', 'GET', {}, Routes), () => t.end())
})

t.test('async type converter', async (t) => {
  t.plan(2)
  const forward = Math.random().toString(36),
    backward = forward.split('').reverse().join('')
  class MyType {
    static async extractValue() {
      return Promise.resolve(forward)
    }
    static async transformValue(value: string | Promise<string>) {
      t.equal(await value, forward)
      return Promise.resolve(backward)
    }
  }
  class Routes {
    @Route.Get('/')
    someRoute(arg: MyType) {
      t.equal(arg, backward)
    }
  }
  const router = new Router({ controllers: [Routes] })
  await router.start()
  await router.middleware(mockContext('/', 'GET', {}, Routes), () => t.end())
})
