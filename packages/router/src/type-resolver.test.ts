import 'reflect-metadata'
import { inject } from '@hapi/shot'
import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'

import { Route } from './annotations/route.annotation.js'
import { TypeResolver } from './type-resolver.js'
import type { RouterContext } from './router.js'
import { Router } from './router.js'
import { kIngressRouterParse, kIngressRouterPick } from './handler.js'

describe('type resolvers', () => {
  it('no registered type converter', async () => {
    let caught = false
    class MyType {}
    class Routes {
      @Route.Get('/:a')
      someRoute(@Route.Param('a') a: MyType) {
        void a
      }
    }
    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))

    try {
      await app.start()
    } catch (e: any) {
      caught = true
      assert.strictEqual(e.message, 'No type converter found for: Routes.someRoute at argument 0:MyType')
    }
    assert.strictEqual(caught, true)
  })

  it('registered type resolver', async () => {
    const payload = Math.random().toString()
    class Routes {
      @Route.Get('/:a')
      someRoute(@Route.Param('a') a: any) {
        assert.strictEqual(a, 'hello world')
        return payload
      }
    }
    const router = new Router({ routes: [Routes] })
    router.registerTypeParser(Object, (x) => x + ' world')

    const app = new Ingress<RouterContext>().use(new Http()).use(router)
    await app.start()
    const result = await inject(app.driver, {
      method: 'GET',
      url: '/hello',
    })

    assert.strictEqual(result.payload, payload)
  })

  it('registered type predicate resolver', async () => {
    const payload = Math.random().toString()
    class MyType {}
    class Routes {
      @Route.Get('/:a')
      someRoute(@Route.Param('a') a: MyType) {
        assert.strictEqual(a, 'hello world')
        return payload
      }
    }
    const router = new Router({ routes: [Routes] })
    router.registerTypePredicateParser(
      (_x) => false,
      (x) => x,
    )
    router.registerTypePredicateParser(
      (x) => x === MyType,
      (x) => x + ' world',
    )
    const app = new Ingress<RouterContext>().use(new Http()).use(router)

    await app.start()
    const result = await inject(app.driver, {
      method: 'GET',
      url: '/hello',
    })

    assert.strictEqual(result.payload, payload)
  })

  it('async type converter', async () => {
    const payload = Math.random().toString(),
      forward = Math.random().toString(36),
      backward = forward.split('').reverse().join('')
    class MyType {
      static async [kIngressRouterPick]() {
        return Promise.resolve(forward)
      }
      static async [kIngressRouterParse](value: string) {
        assert.strictEqual(value, forward)
        return Promise.resolve(backward)
      }
    }
    class Routes {
      @Route.Get('/')
      someRoute(arg: MyType) {
        assert.strictEqual(arg, backward)
        return payload
      }
      @Route.Get('/req')
      reqRoute(arg: Request) {
        assert.ok(arg instanceof Request)
        return forward
      }
    }

    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))

    await app.start()
    const result = await inject(app.driver, {
        method: 'GET',
        url: '/',
      }),
      result1 = await inject(app.driver, {
        method: 'GET',
        url: '/req',
      })

    assert.strictEqual(result.payload, payload)
    assert.strictEqual(result1.payload, forward)
  })

  async function throws(fn: any, msg: string) {
    try {
      await fn()
    } catch (e: any) {
      assert.ok(e.message.includes(msg))
      return e
    }
    throw `Expected ${fn.toString()} to have thrown`
  }

  it('default type converters', () => {
    const r = new TypeResolver(),
      num = r.get(Number),
      str = r.get(String),
      date = r.get(Date),
      bool = r.get(Boolean)
    assert.strictEqual(num?.parse?.('5'), 5)
    assert.strictEqual(str?.parse?.(1234), '1234')
    const parseBool =
      ('parse' in bool! && bool.parse) ||
      (() => {
        throw new Error('Expected bool.parse')
      })
    assert.strictEqual(
      parseBool(0) === parseBool('0') &&
        parseBool(undefined) === parseBool(null) &&
        parseBool(false) === parseBool('') &&
        parseBool(undefined) === false &&
        parseBool('1') === parseBool(1) &&
        parseBool(true) === true &&
        parseBool('true') === true,
      true,
    )
    assert.strictEqual(date?.parse?.('2021-12-12').toISOString(), new Date('2021-12-12').toISOString())
  })

  it('default type converter errors', async () => {
    const tests = [
        [Number, 'wat', 'cannot convert "wat" to number'],
        [String, undefined, 'cannot convert undefined to string'],
        [Date, 'asdf', 'cannot convert "asdf" to Date'],
        [Boolean, 1234, 'cannot convert 1234 to boolean'],
      ] as const,
      r = new TypeResolver()
    for (const [type, input, errorText] of tests) {
      const error = await throws(() => r.get(type as any)?.parse?.(input), errorText)
      assert.strictEqual(error.statusCode, 400)
    }
  })
})
