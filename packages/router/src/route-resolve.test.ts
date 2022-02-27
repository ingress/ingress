// import * as t from 'uvu/assert'
// import { test } from 'uvu'
// import { RouteAnnotation, UpgradeRouteAnnotation } from './annotations/route.annotation.js'
// import { resolvePaths, RouteMetadata } from './route-resolve.js'

// test('resolvePaths', () => {
//   class TestRoute {
//     myRoute(param1: any, param2: any, param3: any) {
//       void param3
//     }
//   }
//   const routeMetadata: RouteMetadata = {
//     classAnnotations: [new RouteAnnotation('/base')],
//     methodAnnotations: [
//       new RouteAnnotation('/my-route', 'GET'),
//       new RouteAnnotation('alternate', 'GET'),
//       new RouteAnnotation('/alternate', 'POST'),
//     ],
//     parameterAnnotations: [],
//     types: {
//       parameters: [],
//     },
//     parent: TestRoute,
//     name: 'myRoute',
//   }
//   t.equal(resolvePaths(routeMetadata), {
//     GET: ['/base/my-route', '/base/alternate'],
//     POST: ['/base/alternate'],
//   })

//   routeMetadata.classAnnotations = []
//   t.equal(resolvePaths(routeMetadata), {
//     GET: ['/my-route', '/alternate'],
//     POST: ['/alternate'],
//   })

//   routeMetadata.classAnnotations = [new RouteAnnotation('/', 'PUT')]
//   t.throws(
//     () => resolvePaths(routeMetadata),
//     'TestRoute.myRoute must provide Http Methods on the base OR sub route, but not both'
//   )

//   routeMetadata.methodAnnotations = [new RouteAnnotation('/')]
//   t.equal(resolvePaths(routeMetadata), {
//     PUT: ['/'],
//   })

//   routeMetadata.methodAnnotations = [new RouteAnnotation()]
//   routeMetadata.classAnnotations = []
//   t.throws(() => resolvePaths(routeMetadata), 'TestRoute.myRoute has no Http Method defined')

//   routeMetadata.methodAnnotations = []
//   routeMetadata.classAnnotations = []
//   t.throws(() => resolvePaths(routeMetadata), 'Must provide at least one path')
// })

// test('Upgrade Route annotation', () => {
//   const annotation = new UpgradeRouteAnnotation('/'),
//     noop: any = () => 'abc'

//   t.equal(annotation.middleware({} as any, noop), 'abc', 'is a noop')

//   const resolvedPaths = resolvePaths({
//     classAnnotations: [],
//     methodAnnotations: [annotation],
//     name: 'somename',
//     parameterAnnotations: [],
//     parent: class {},
//     types: { parameters: [] },
//   })
//   t.equal(resolvedPaths, { UPGRADE: ['/'] })
// })

// test.run()
