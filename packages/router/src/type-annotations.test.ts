import t from 'tap'
import { Route } from './annotations/route.annotation.js'
import { mockApp, mockContext } from './context.util.test.js'
import { Router } from './router.js'

t.test('type parameters extract and transform', async (t) => {
  t.plan(1)
  const forward = Math.random().toString(36),
    backward = forward.split('').reverse().join('')
  class MyType {
    static extractValue() {
      return forward
    }
    static transformValue(_value: string) {
      return backward
    }
  }
  class Routes {
    @Route.Get('/')
    someRoute(arg: MyType) {
      t.equal(arg, backward)
    }
  }
  const router = new Router({ controllers: [Routes] }),
    app = mockApp()
  await router.start(app, () => Promise.resolve())
  await router.middleware(mockContext('/', 'GET', {}, Routes), () => t.end())
})

t.test('type parameters transform with param annotation extract', async (t) => {
  t.plan(1)
  const forward = Math.random().toString(36),
    expectedBackward = forward.split('').reverse().join('')
  class MyType {
    static transformValue(value: string) {
      return value.split('').reverse().join('')
    }
  }
  class Routes {
    @Route.Get('/:forwards')
    someRoute(@Route.Path('forwards') arg: MyType) {
      t.equal(arg, expectedBackward)
    }
  }
  const router = new Router({ controllers: [Routes] }),
    app = mockApp()
  await router.start(app, () => Promise.resolve())
  await router.middleware(mockContext(`/${forward}`, 'GET', {}, Routes), () => t.end())
})

t.test('default type resolvers', async (t) => {
  t.plan(5)
  class Routes {
    @Route.Get('/:a/:b/:c/:d/:e')
    someRoute(
      @Route.Path('a') a: number,
      @Route.Path('b') b: boolean,
      @Route.Path('c') c: string,
      @Route.Path('d') d: Date,
      @Route.Path('e') e: boolean
    ) {
      t.equal(a, 1)
      t.equal(b, false)
      t.equal(c, 'true')
      t.equal(d.toISOString(), new Date('10-10-2020').toISOString())
      t.equal(e, true)
    }
  }
  const router = new Router({ controllers: [Routes] }),
    app = mockApp()
  await router.start(app, () => Promise.resolve())
  await router.middleware(mockContext(`/1/false/true/10-10-2020/true`, 'GET'), () => t.end())
})
