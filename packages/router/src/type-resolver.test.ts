import 'reflect-metadata'
import { inject } from '@hapi/shot'
import { describe, it, expect } from 'vitest'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'

import { Route } from './annotations/route.annotation.js'
import { TypeResolver } from './type-resolver.js'
import type { RouterContext } from './router.js'
import { Router } from './router.js'

describe('type resolvers', () => {
  it('no registered type converter', async () => {
    let plan = 0
    class MyType {}
    class Routes {
      @Route.Get('/:a')
      someRoute(@Route.Param('a') a: MyType) {
        plan++
        void a
      }
    }
    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))

    try {
      await app.start()
    } catch (e: any) {
      plan++
      expect(e.message).toEqual(
        'No type converter found for: Routes.someRoute at argument 0:MyType',
      )
    }
    expect(plan).toEqual(1)
  })

  it('registered type resolver', async () => {
    const payload = Math.random().toString()
    class Routes {
      @Route.Get('/:a')
      someRoute(@Route.Param('a') a: any) {
        expect(a).toEqual('hello world')
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

    expect(result.payload).toEqual(payload)
  })

  it('registered type predicate resolver', async () => {
    const payload = Math.random().toString()
    class MyType {}
    class Routes {
      @Route.Get('/:a')
      someRoute(@Route.Param('a') a: MyType) {
        expect(a).toEqual('hello world')
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

    expect(result.payload).toEqual(payload)
  })

  it('async type converter', async () => {
    const payload = Math.random().toString(),
      forward = Math.random().toString(36),
      backward = forward.split('').reverse().join('')
    class MyType {
      static async pick() {
        return Promise.resolve(forward)
      }
      static async parse(value: string | Promise<string>) {
        expect(await value).toEqual(forward)
        return Promise.resolve(backward)
      }
    }
    class Routes {
      @Route.Get('/')
      someRoute(arg: MyType) {
        expect(arg).toEqual(backward)
        return payload
      }
    }

    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))

    await app.start()
    const result = await inject(app.driver, {
      method: 'GET',
      url: '/',
    })

    expect(result.payload).toEqual(payload)
  })

  async function throws(fn: any, msg: string) {
    try {
      await fn()
    } catch (e: any) {
      expect(e.message.includes(msg)).toEqual(true)
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
    expect('parse' in num! && num.parse('5')).toBe(5)
    expect('parse' in str! && str.parse(1234)).toEqual('1234')
    const parse =
      ('parse' in bool! && bool.parse) ||
      (() => {
        throw new Error('Expected bool.parse')
      })
    expect(
      parse(0) === parse('0') &&
        parse(undefined) === parse(null) &&
        parse(false) === parse('') &&
        parse(undefined) === false &&
        parse('1') === parse(1) &&
        parse(true) === true &&
        parse('true') === true,
    ).toBe(true)
    expect('parse' in date! && date.parse('2021-12-12').toISOString()).toEqual(
      new Date('2021-12-12').toISOString(),
    )
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
      const error = await throws(() => {
        const resolver = r.get(type as any)
        return 'parse' in resolver! && resolver.parse(input)
      }, errorText)
      expect(error.statusCode).toEqual(400)
    }
  })
})
