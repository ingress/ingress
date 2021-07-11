import t from 'tap'
import {
  BodyParamAnnotation,
  RouteAnnotation,
  PathParamAnnotation,
  QueryParamAnnotation,
  HeaderParamAnnotation,
} from './annotations/route.annotation.js'
import { mockContext } from './context.util.test.js'
import { resolveRouteMiddleware } from './handler.js'

const noop: any = () => {
  void 0
}

t.test('BodyParamAnnotation', async (t) => {
  t.plan(3)
  let tested = false
  const expectedBody = { prop: {} },
    routeMetadata = {
      methodAnnotations: [new RouteAnnotation('/', 'GET')],
      name: 'abcd',
      parameterAnnotations: [new BodyParamAnnotation(), undefined, new BodyParamAnnotation('prop')],
      parent: class {
        abcd(paramA: any, x: any, paramB: any) {
          if (!tested) {
            t.equal(paramA, expectedBody)
            t.equal(x, context.req)
            t.equal(paramB, expectedBody.prop)
            tested = true
          }
        }
      },
    },
    route = resolveRouteMiddleware(routeMetadata)

  let context = mockContext('/', 'GET', { body: expectedBody }, routeMetadata.parent)
  await route(context, noop)
  context = mockContext('/', 'GET', { overrides: { route: undefined } }, routeMetadata.parent)
  await route(context, () => t.end())
})

t.test('PathParamAnnotation', async (t) => {
  t.plan(3)
  let tested = false
  const expectedParams = [
      ['a', 'b'],
      ['prop', 'value'],
    ],
    routeMetadata = {
      name: 'abcd',
      parameterAnnotations: [new PathParamAnnotation(), undefined, new PathParamAnnotation('prop')],
      parent: class {
        abcd(paramA: any, x: any, paramB: any) {
          if (!tested) {
            t.equal(paramA, expectedParams)
            t.equal(x, context.req)
            t.equal(paramB, 'value')
            tested = true
          }
        }
      },
    },
    route = resolveRouteMiddleware(routeMetadata)
  let context = mockContext('/', 'GET', { params: expectedParams }, routeMetadata.parent)
  await route(context, noop)
  context = mockContext('/', 'GET', { overrides: { route: undefined } }, routeMetadata.parent)
  await route(context, () => t.end())
})

t.test('URLSearchParams type', async (t) => {
  t.plan(2)
  const routeMetadata = {
      name: 'abcd',
      parent: class {
        abcd(paramA: any, x: any) {
          t.ok(paramA instanceof URLSearchParams)
          t.equal(x, context.req)
        }
      },
      types: { parameters: [URLSearchParams, undefined] },
    },
    route = resolveRouteMiddleware(routeMetadata),
    context = mockContext('/', 'GET', {}, routeMetadata.parent)

  await route(context, () => t.end())
})

t.test('QueryParamAnnotation', async (t) => {
  t.plan(3)
  let tested = false
  const params = new URLSearchParams('something=route&prop=value'),
    routeMetadata = {
      name: 'abcd',
      parameterAnnotations: [
        new QueryParamAnnotation('something'),
        undefined,
        new QueryParamAnnotation('prop'),
      ],
      parent: class {
        abcd(paramA: any, x: any, paramB: any) {
          if (!tested) {
            t.equal(paramA, 'route')
            t.equal(paramB, 'value')
            t.equal(x, context.req)
            tested = true
          }
        }
      },
    },
    route = resolveRouteMiddleware(routeMetadata)
  let context = mockContext(
    '/',
    'GET',
    {
      searchParams: params,
    },
    routeMetadata.parent
  )

  await route(context, noop)
  context = mockContext('/', 'GET', { overrides: { route: undefined } }, routeMetadata.parent)
  await route(context, () => t.end())
})

t.test('HeaderParamAnnotation', async (t) => {
  t.plan(3)
  const expectedHeaders = { 'content-type': 'application/json', 'content-length': 42 },
    routeMetadata = {
      name: 'abcd',
      parameterAnnotations: [
        new HeaderParamAnnotation('content-type'),
        undefined,
        new HeaderParamAnnotation('content-length'),
      ],
      parent: class {
        abcd(paramA: any, x: any, paramB: any) {
          t.equal(paramA, 'application/json')
          t.equal(x, context.req)
          t.equal(paramB, 42)
        }
      },
    },
    route = resolveRouteMiddleware(routeMetadata),
    context = mockContext('/', 'GET', { headers: expectedHeaders }, routeMetadata.parent)

  await route(context, () => t.end())
})
