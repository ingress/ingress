import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { inject } from '@hapi/shot'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { Route } from './annotations/route.annotation.js'
import type { RouterContext } from './router.js'
import { Router } from './router.js'

describe('type annotations', () => {
  it('type parameters pick and parse', async () => {
    const forward = Math.random().toString(36),
      backward = forward.split('').reverse().join('')
    class MyType {
      static pick(context: RouterContext) {
        expect((context.request as any).url).toEqual('http://localhost:80/')
        return forward
      }
      static parse(_value: string) {
        return backward
      }
    }
    class Routes {
      @Route.Get('/')
      someRoute(arg: MyType) {
        expect(arg).toEqual(backward)
        return forward + backward
      }
    }
    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
    await app.start()
    const result = await inject(app.driver, {
      method: 'GET',
      url: '/',
    })
    expect(result.payload).toEqual(forward + backward)
  })

  it('type parameters transform with param annotation preferred pick', async () => {
    const forward = Math.random().toString(36),
      expectedBackward = forward.split('').reverse().join('')
    class MyType {
      static pick(_: RouterContext) {
        throw new Error('unreachable: should not be called')
      }
      static parse(value: string) {
        return value.split('').reverse().join('')
      }
    }
    class Routes {
      @Route.Get('/:forwards')
      someRoute(@Route.Param('forwards') arg: MyType) {
        expect(arg).toEqual(expectedBackward)
      }
    }
    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
    await app.start()

    const result = await inject(app.driver, {
      method: 'GET',
      url: `/${forward}`,
    })

    expect(result.statusCode).toBe(200)
  })

  it('default type resolvers', async () => {
    let asserted = false
    class Routes {
      @Route.Get('/:a/:b/:c/:d/:e')
      someRoute(
        @Route.Param('a') a: number,
        @Route.Param('b') b: boolean,
        @Route.Param('c') c: string,
        @Route.Param('d') d: Date,
        @Route.Param('e') e: boolean,
      ) {
        expect(a).toBe(1)
        expect(b).toBe(false)
        expect(c).toBe('true')
        expect(d.toISOString()).toBe(new Date('2020-10-10').toISOString())
        expect(e).toBe(true)
        asserted = true
      }
    }
    const router = new Router({ routes: [Routes] }),
      app = new Ingress<RouterContext>().use(new Http()).use(router)

    await app.start()

    const result = await inject(app.driver, {
      method: 'GET',
      url: '/1/false/true/2020-10-10/true',
    })

    expect(result.statusCode).toBe(200)
    expect(asserted).toBe(true)
  })
})
