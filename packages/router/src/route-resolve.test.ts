import { describe, it, expect } from 'vitest'
import { RouteAnnotation, UpgradeRouteAnnotation } from './annotations/route.annotation.js'
import type { RouteMetadata } from './route-resolve.js'
import { resolvePaths } from './route-resolve.js'

describe('route annotations', () => {
  it('resolvePaths', () => {
    class TestRoute {
      myRoute(param1: any, param2: any, param3: any) {
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
    expect(resolvePaths(routeMetadata)).toEqual({
      GET: ['/base/my-route', '/base/alternate'],
      POST: ['/base/alternate'],
    })

    routeMetadata.controllerAnnotations = []
    expect(resolvePaths(routeMetadata)).toEqual({
      GET: ['/my-route', '/alternate'],
      POST: ['/alternate'],
    })

    routeMetadata.controllerAnnotations = [new RouteAnnotation('/', 'PUT')]
    expect(() => resolvePaths(routeMetadata)).toThrow(
      'TestRoute.myRoute must provide Http Methods on the base OR sub route, but not both'
    )

    routeMetadata.methodAnnotations = [new RouteAnnotation('/')]
    expect(resolvePaths(routeMetadata)).toEqual({ PUT: ['/'] })

    routeMetadata.methodAnnotations = [new RouteAnnotation()]
    routeMetadata.controllerAnnotations = []
    expect(() => resolvePaths(routeMetadata)).toThrow(
      'TestRoute.myRoute has no Http Method defined'
    )

    routeMetadata.methodAnnotations = []
    routeMetadata.controllerAnnotations = []
    expect(() => resolvePaths(routeMetadata)).toThrow(
      'Must provide at least one route with a method'
    )
  })

  it('Upgrade Route annotation', () => {
    const annotation = new UpgradeRouteAnnotation('/'),
      noop: any = () => 'abc'

    expect(annotation.middleware({} as any, noop)).toEqual('abc')

    const resolvedPaths = resolvePaths({
      controllerAnnotations: [],
      methodAnnotations: [annotation],
      name: 'somename',
      parameterAnnotations: [],
      controller: class {},
      types: { parameters: [] },
    })
    expect(resolvedPaths).toEqual({ UPGRADE: ['/'] })
  })
})
