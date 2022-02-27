import 'reflect-metadata'
import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { test } from 'uvu'
import * as t from 'uvu/assert'
import { Route } from './annotations/route.annotation.js'
import { Router } from './router.js'

test.only('no registered type converter', async () => {
  let plan = 0
  class Routes {
    @Route.Get('/:a')
    someRoute(@Route.Path('a') a: any) {
      plan++
      void a
    }
  }
  const app = new Ingress().use(new Http()).use(new Router({ controllers: [Routes] }))
  try {
    await app.start()
  } catch (e: any) {
    plan++
    console.log(e.stack)
    t.equal(e.message, 'No type converter found for: Routes.someRoute at argument 0:Object')
  }
  t.equal(plan, 1)
})

test('registered type resolver', async () => {
  //t.plan(1)
  class Routes {
    @Route.Get('/:a')
    someRoute(@Route.Path('a') a: any) {
      t.equal(a, 'hello world')
    }
  }
  const router = new Router({ controllers: [Routes] })
  router.registerTypeResolver(Object, (x) => x + ' world')
  // const app = mockApp()
  // await router.start(app, () => Promise.resolve())
  // await router.middleware(mockContext('/hello', 'GET', {}, Routes), () => )
})

test('registered type predicate resolver', async () => {
  //t.plan(1)
  let plan = 0
  class Routes {
    @Route.Get('/:a')
    someRoute(@Route.Path('a') a: any) {
      plan++
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
  // await router.start(mockApp(), noop)
  // await router.middleware(mockContext('/hello', 'GET', {}, Routes), () => {})
  t.equal(plan, 1)
})

test('async type converter', async () => {
  //t.plan(2)
  let plan = 0
  const forward = Math.random().toString(36),
    backward = forward.split('').reverse().join('')
  class MyType {
    static async extractValue() {
      return Promise.resolve(forward)
    }
    static async transformValue(value: string | Promise<string>) {
      plan++
      t.equal(await value, forward)
      return Promise.resolve(backward)
    }
  }
  class Routes {
    @Route.Get('/')
    someRoute(arg: MyType) {
      plan++
      t.equal(arg, backward)
    }
  }
  const router = new Router({ controllers: [Routes] })
  // await router.start(mockApp(), noop)
  // await router.middleware(mockContext('/', 'GET', {}, Routes), () => {})
  t.equal(plan, 2)
})

test.run()
