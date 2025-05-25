import 'reflect-metadata'
import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import {
  PathParamAnnotation,
  BodyParamAnnotation,
  RouteAnnotation,
  QueryParamAnnotation,
  HeaderParamAnnotation,
} from './route.annotation.js'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import type { RouterContext } from '../router.js'
import { Router } from '../router.js'
import { inject } from '@hapi/shot'
import type { RouteMetadata } from '../route-resolve.js'

describe('param annotations', () => {
  it('ParamAnnotations', async () => {
    const router = new Router(),
      http = new Http(),
      app = new Ingress<RouterContext>().use(http).use(router),
      expectedResponse = Math.random().toString()
    class controller {
      abcd(paramA: any, x: any, paramB: any, paramC: any, paramD: any, paramE: any, paramF: any) {
        assert.strictEqual(paramA.expectedBody, 123)
        assert.strictEqual(x.pathname, '/some/asdf/4')
        assert.strictEqual(paramB, 345)
        assert.strictEqual(paramC, 'asdf')
        assert.strictEqual(paramD, '4')
        assert.strictEqual(paramE, '1234')
        assert.strictEqual(paramF, '0123')
        return expectedResponse
      }
    }
    const routeMetadata = {
      name: 'abcd',
      parameterAnnotations: [
        new BodyParamAnnotation(),
        undefined,
        new BodyParamAnnotation('prop'),
        new PathParamAnnotation('path'),
        new PathParamAnnotation('value'),
        new QueryParamAnnotation('asdf'),
        new HeaderParamAnnotation('x-some-header'),
      ],
      methodAnnotations: [new RouteAnnotation('/some/:path/:value', 'POST')],
      controller,
    }
    app.use({
      start() {
        router.registerRouteMetadata(routeMetadata)
      },
    })
    await app.start()
    const result = await inject(app.driver, {
      method: 'POST',
      headers: { 'x-some-header': '0123' },
      payload: { expectedBody: 123, prop: 345 },
      url: '/some/asdf/4?asdf=1234',
    })
    assert.strictEqual(result.payload, expectedResponse)
  })

  it('URLSearchParams type', async () => {
    const router = new Router(),
      http = new Http(),
      app = new Ingress<RouterContext>().use(http).use(router),
      routeMetadata: RouteMetadata = {
        name: 'abcd',
        controller: class {
          abcd(paramA: any) {
            assert.ok(paramA instanceof URLSearchParams)
            assert.strictEqual(paramA.get('asdf'), '1234')
            return paramA.get('hello')
          }
        },
        methodAnnotations: [new RouteAnnotation('/', 'POST')],
        types: { parameters: [URLSearchParams, undefined] },
      }
    app.use({
      start() {
        router.registerRouteMetadata(routeMetadata)
      },
    })
    await app.start()
    const result = await inject(app.driver, {
      method: 'POST',
      payload: { expectedBody: 123, prop: 345 },
      url: '/?asdf=1234&hello=world',
    })
    assert.strictEqual(result.payload, 'world')
  })
})
