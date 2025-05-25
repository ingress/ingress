import 'reflect-metadata'
import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { inject } from '@hapi/shot'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { Route } from './annotations/route.annotation.js'
import type { RouterContext } from './router.js'
import { Router } from './router.js'
import { kIngressRouterParse, kIngressRouterPick } from './handler.js'

describe('type annotations', () => {
  it('type parameters pick and parse', async () => {
    const forward = Math.random().toString(36),
      backward = forward.split('').reverse().join('')
    class MyType {
      static [kIngressRouterPick](context: RouterContext) {
        assert.strictEqual((context.request as any).url, 'http://localhost:80/')
        return forward
      }
      static [kIngressRouterParse](_value: string) {
        return backward
      }
    }
    class Routes {
      @Route.Get('/')
      someRoute(arg: MyType) {
        assert.strictEqual(arg, backward)
        return forward + backward
      }
    }
    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
    await app.start()
    const result = await inject(app.driver, {
      method: 'GET',
      url: '/',
    })
    assert.strictEqual(result.payload, forward + backward)
  })

  it('type parameters transform with param annotation preferred pick', async () => {
    const forward = Math.random().toString(36),
      expectedBackward = forward.split('').reverse().join('')
    class MyType {
      static [kIngressRouterPick](_: RouterContext) {
        throw new Error('unreachable: should not be called')
      }
      static [kIngressRouterParse](value: string) {
        return value.split('').reverse().join('')
      }
    }
    class Routes {
      @Route.Get('/:forwards')
      someRoute(@Route.Param('forwards') arg: MyType) {
        assert.strictEqual(arg, expectedBackward)
      }
    }
    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
    await app.start()

    const result = await inject(app.driver, {
      method: 'GET',
      url: `/${forward}`,
    })

    assert.strictEqual(result.statusCode, 200)
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
        assert.strictEqual(a, 1)
        assert.strictEqual(b, false)
        assert.strictEqual(c, 'true')
        assert.strictEqual(d.toISOString(), new Date('2020-10-10').toISOString())
        assert.strictEqual(e, true)
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

    assert.strictEqual(result.statusCode, 200)
    assert.strictEqual(asserted, true)
  })
})
