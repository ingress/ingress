import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { inject } from '@hapi/shot'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { Route } from './annotations/route.annotation.js'
import type { RouterContext } from './router.js'
import { Router } from './router.js'

describe('type annotations', () => {
  it('type parameters extract and transform', async () => {
    const forward = Math.random().toString(36),
      backward = forward.split('').reverse().join('')
    class MyType {
      static extractValue(context: RouterContext) {
        expect(context.request.toRequest().url).toEqual('http://localhost/')
        return forward
      }
      static transformValue(_value: string) {
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

  it('type parameters transform with param annotation extract', async () => {
    const forward = Math.random().toString(36),
      expectedBackward = forward.split('').reverse().join('')
    class MyType {
      static transformValue(value: string) {
        return value.split('').reverse().join('')
      }
    }
    class Routes {
      @Route.Get('/:forwards')
      someRoute(@Route.Param('forwards') arg: MyType) {
        expect(arg).toEqual(expectedBackward)
      }
    }
    void new Router({ routes: [Routes] })
  })

  it('default type resolvers', async () => {
    class Routes {
      @Route.Get('/:a/:b/:c/:d/:e')
      someRoute(
        @Route.Param('a') a: number,
        @Route.Param('b') b: boolean,
        @Route.Param('c') c: string,
        @Route.Param('d') d: Date,
        @Route.Param('e') e: boolean
      ) {
        expect(a).toBe(1)
        expect(b).toBe(false)
        expect(c).toBe('true')
        expect(d.toISOString()).toBe(new Date('10-10-2020').toISOString())
        expect(e).toBe(true)
      }
    }
    const router = new Router({ routes: [Routes] }),
      app = new Ingress<RouterContext>().use(new Http())
    await router.start(app, () => Promise.resolve())
    //await router.middleware(mockContext(`/1/false/true/10-10-2020/true`, 'GET'), () => t.end())
  })
})
