import 'reflect-metadata'
import t from 'tap'
import { Router } from './router.js'
import { Readable } from 'stream'
import { Route, RouteAnnotation } from './annotations/route.annotation.js'
import { compose } from 'app-builder'
import type { Type } from './annotations/controller.annotation.js'

function sample<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function stream<T>(data: T | null = null) {
  return new Readable({
    read() {
      this.push(data)
      if (data) this.push(null)
    },
  })
}

function mockContext(url: string, method: string, data?: any, ...deps: Type<any>[]) {
  return {
    req: Object.assign(stream(data), { url, method }),
    res: { statusCode: 0 },
    scope: mockContainer(deps),
    parse() {
      return Promise.resolve(data)
    },
  }
}

function mockContainer(deps: Type<any>[]) {
  const result = new Map<any, any>()
  for (const dep of deps) {
    result.set(dep, new dep())
  }
  return result
}

t.test('Route miss', async (t) => {
  const router = new Router()
  router.start()
  let called = false,
    finished = false
  router.on('GET', '/some/route', (c, next) => {
    called = true
    return next()
  })
  const context = mockContext('/', 'GET'),
    finish = (ctx: any, next: any) => {
      finished = true
      return next()
    }
  await compose(router.middleware, finish)(context)
  t.equal(called, false, 'route is called')
  t.equal(context.res.statusCode, 404, 'status code is 404')
  t.equal(finished, true, 'finished')
  t.end()
})

t.test('Route hit+query', async (t) => {
  const router = new Router()
  router.start()
  let called = false,
    finished = false

  router.on('GET', '/some/route', (c, next) => {
    called = true
    t.equal(c.route.query.get('some'), 'query')
    t.equal(c.route.queryString, 'some=query')
    return next()
  })

  const context = mockContext(`/some/route${sample([';', '#', '?'])}some=query`, 'GET'),
    finish = (context: any, next: any) => {
      finished = true
      return next()
    }

  await compose(router.middleware, finish)(context)
  t.equal(called, true, 'route is called')
  t.equal(finished, true, 'finished')
  t.equal(context.res.statusCode, 200, 'status code is 200')
  t.end()
})

t.test('Route Execution with Annotations', async (t) => {
  const router = new Router()
  let called = false,
    finished = false
  @router.Controller('parent')
  class Routes {
    @Route.Get('/child', 'PUT', Route.Post)
    someroute() {
      called = true
    }
  }
  router.start()
  const middleware = router.middleware,
    context = mockContext('/parent/child', 'POST', null, Routes),
    finish = (_: any, next: any) => {
      finished = true
      return next()
    }

  await compose(middleware, finish)(context)
  t.equal(called, true, 'called')
  t.equal(finished, true, 'finished')
  t.equal(context.res.statusCode, 200, 'status code is 200')
  t.end()
})

t.test('Route Execution with plain Metadata', async (t) => {
  const router = new Router()
  let called = false,
    finished = false
  class Routes {
    otherRoute() {
      called = true
    }
  }
  //TODO nicer api for adding routes without typescript metadata
  router.metadata.add({
    classAnnotations: [new RouteAnnotation('parent')],
    methodAnnotations: [new RouteAnnotation('child2', 'GET')],
    parameterAnnotations: [],
    types: { parameters: [] },
    name: 'otherRoute',
    parent: Routes,
  })
  const context = mockContext('/parent/child2', 'GET', null, Routes),
    finish = (_: any, next: any) => {
      finished = true
      return next()
    }
  router.start()
  await compose(router.middleware, finish)(context)
  t.equal(called, true, 'called')
  t.equal(finished, true, 'finished')
  t.equal(context.res.statusCode, 200, 'status code is 200')
  t.end()
})
