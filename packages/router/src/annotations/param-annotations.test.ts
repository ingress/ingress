import 'reflect-metadata'
import { test } from 'uvu'
import * as t from 'uvu/assert'
import {
  PathParamAnnotation,
  BodyParamAnnotation,
  RouteAnnotation,
  QueryParamAnnotation,
  HeaderParamAnnotation,
} from './route.annotation.js'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { Router } from '../router.js'
import { inject } from '@hapi/shot'
import type { RouteMetadata } from '../route-resolve.js'

test('ParamAnnotations', async () => {
  const router = new Router(),
    http = new Http(),
    app = new Ingress().use(http).use(router),
    expectedResponse = Math.random().toString()
  class controller {
    abcd(paramA: any, x: any, paramB: any, paramC: any, paramD: any, paramE: any, paramF: any) {
      t.equal(paramA.expectedBody, 123)
      t.equal(x.pathname, '/some/asdf/4')
      t.equal(paramB, 345)
      t.equal(paramC, 'asdf')
      t.equal(paramD, '4')
      t.equal(paramE, '1234')
      t.equal(paramF, '0123')
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
  t.equal(result.payload, expectedResponse)
})

test('URLSearchParams type', async () => {
  const router = new Router(),
    http = new Http(),
    app = new Ingress().use(http).use(router),
    routeMetadata: RouteMetadata = {
      name: 'abcd',
      controller: class {
        abcd(paramA: any) {
          t.ok(paramA instanceof URLSearchParams)
          t.equal(paramA.get('asdf'), '1234')
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
  t.equal(result.payload, 'world')
})

test.run()
