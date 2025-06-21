import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { RouteAnnotation, UpgradeRouteAnnotation } from './annotations/route.annotation.js'
import type { RouteMetadata } from './route-resolve.js'
import { resolvePaths } from './route-resolve.js'

describe('route annotations', () => {
  it('resolvePaths', () => {
    class TestRoute {
      myRoute(_param1: any, _param2: any, param3: any) {
        void param3
      }
    }
    const routeMetadata: RouteMetadata = {
      controllerAnnotations: [new RouteAnnotation('/base')],
      methodAnnotations: [
        new RouteAnnotation('/my-route', 'GET'),
        new RouteAnnotation('alternate', 'GET'),
        new RouteAnnotation('/alternate', 'POST'),
      ],
      parameterAnnotations: [],
      types: {
        parameters: [],
      },
      controller: TestRoute,
      name: 'myRoute',
    }
    assert.deepStrictEqual(resolvePaths(routeMetadata), {
      GET: ['/base/my-route', '/base/alternate'],
      POST: ['/base/alternate'],
    })

    routeMetadata.controllerAnnotations = []
    assert.deepStrictEqual(resolvePaths(routeMetadata), {
      GET: ['/my-route', '/alternate'],
      POST: ['/alternate'],
    })

    routeMetadata.controllerAnnotations = [new RouteAnnotation('/', 'PUT')]
    assert.throws(
      () => resolvePaths(routeMetadata),
      /TestRoute\.myRoute must provide Http Methods on the base OR sub route, but not both/,
    )

    routeMetadata.methodAnnotations = [new RouteAnnotation('/')]
    assert.deepStrictEqual(resolvePaths(routeMetadata), { PUT: ['/'] })

    routeMetadata.methodAnnotations = [new RouteAnnotation()]
    routeMetadata.controllerAnnotations = []
    assert.throws(() => resolvePaths(routeMetadata), /TestRoute\.myRoute has no Http Method defined/)

    routeMetadata.methodAnnotations = []
    routeMetadata.controllerAnnotations = []
    assert.throws(() => resolvePaths(routeMetadata), /Must provide at least one route with a method/)
  })

  it('Upgrade Route annotation', () => {
    const annotation = new UpgradeRouteAnnotation('/'),
      noop: any = () => 'abc'

    assert.strictEqual(annotation.middleware({} as any, noop), 'abc')

    const resolvedPaths = resolvePaths({
      controllerAnnotations: [],
      methodAnnotations: [annotation],
      name: 'somename',
      parameterAnnotations: [],
      controller: class {},
      types: { parameters: [] },
    })
    assert.deepStrictEqual(resolvedPaths, { UPGRADE: ['/'] })
  })
})
