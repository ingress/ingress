import 'reflect-metadata'
import t from 'tap'
import { Router, Route } from './router.js'
import { PathParamAnnotation, RouteAnnotation, Upgrade } from './annotations/route.annotation.js'
import { mockApp, mockContext } from './context.util.test.js'
import { createAnnotationFactory } from '../../reflect-annotations/lib/cjs/annotations.js'
import reflectAnnotations from 'reflect-annotations'

function sample<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

const noop = () => {
    void 0
  },
  midNoop = () => Promise.resolve()

t.test('readUrl', (t) => {
  t.same(Router.readUrl('/hello/world?whats=up'), ['/hello/world', 'whats=up'])
  t.same(Router.readUrl('/hello/world#whats=up'), ['/hello/world', 'whats=up'])
  t.same(Router.readUrl('/hello/world;whats=up'), ['/hello/world', 'whats=up'])
  t.same(Router.readUrl(''), ['/', ''])
  t.end()
})

t.test('Route miss', async (t) => {
  const router = new Router()

  await router.start(mockApp(), midNoop)
  let called = false,
    finished = false
  router.on('GET', '/some/route', (c: any, next: any) => {
    called = true
    return next()
  })
  const context = mockContext('/', 'GET')
  await router.middleware(context, () => {
    finished = true
  })
  t.equal(called, false, 'route is called')
  t.equal(context.res.statusCode, 404, 'status code is 404')
  t.equal(finished, true, 'finished')
  t.end()
})

t.test('Route hit+query', async (t) => {
  const router = new Router()
  await router.start(mockApp(), midNoop)
  let called = false,
    finished = false

  router.on('GET', '/some/route', (c: any, next: any) => {
    called = true
    t.equal(c.route.searchParams.get('some'), 'query')
    t.equal(c.route.queryString, 'some=query')
    return next()
  })
  const context = mockContext(`/some/route${sample([';', '#', '?'])}some=query`, 'GET')
  await router.middleware(context, () => {
    finished = true
  })
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
  await router.start(mockApp(), midNoop)
  const context = mockContext('/parent/child', 'POST', {}, Routes)
  await router.middleware(context, () => {
    finished = true
  })
  t.equal(called, true, 'called')
  t.equal(finished, true, 'finished')
  t.equal(context.res.statusCode, 200, 'status code is 200')
  t.end()
})

t.test('bad type input', async (t) => {
  t.plan(8)
  const router = new Router()
  @router.Controller()
  class Routes {
    @Route.Get('/number/:a')
    numberRoute(@Route.Path('a') a: number) {
      void a
    }
    @Route.Get('/bool/:a')
    boolRoute(@Route.Path('a') a: boolean) {
      void a
    }
    @Route.Get('/date/:a')
    dateRoute(@Route.Path('a') a: Date) {
      void a
    }
    @Route.Get('/string/:a')
    invalidStringRoute(@Route.Path('b') a: string) {
      void a
    }
  }
  await router.start(mockApp(), midNoop)
  let context = mockContext('/number/one', 'GET', {}, Routes)
  try {
    await router.middleware(context, noop)
  } catch (e: any) {
    t.equal(e.message, 'cannot convert "one" to number')
    t.equal(e.statusCode, 400)
  }
  try {
    context = mockContext('/bool/one', 'GET', {}, Routes)
    await router.middleware(context, noop)
  } catch (e: any) {
    t.equal(e.message, 'cannot convert "one" to boolean')
    t.equal(e.statusCode, 400)
  }
  try {
    context = mockContext('/date/one', 'GET', {}, Routes)
    await router.middleware(context, noop)
  } catch (e: any) {
    t.equal(e.message, 'cannot convert "one" to Date')
    t.equal(e.statusCode, 400)
  }
  try {
    context = mockContext('/string/one', '', {}, Routes)
    await router.middleware(context, noop)
  } catch (e: any) {
    t.equal(e.message, 'cannot convert undefined to string')
    t.equal(e.statusCode, 400)
  }

  t.end()
})

t.test('Route Execution with plain Metadata', async (t) => {
  const router = new Router()
  let called = false,
    finished = false
  class Routes {
    otherRoute(variable: string) {
      t.equal(variable, 'something')
      called = true
    }
  }
  router.metadata.add({
    classAnnotations: [new RouteAnnotation('parent')],
    methodAnnotations: [new RouteAnnotation('child2/:variable', 'GET')],
    parameterAnnotations: [new PathParamAnnotation('variable')],
    types: { parameters: [] },
    name: 'otherRoute',
    parent: Routes,
  })
  const context = mockContext('/parent/child2/something', 'GET', {}, Routes)
  await router.start(mockApp(), midNoop)
  await router.middleware(context, () => {
    finished = true
  })
  t.equal(called, true, 'called')
  t.equal(finished, true, 'finished')
  t.equal(context.res.statusCode, 200, 'status code is 200')
  t.end()
})

t.test('accepts upgrade route', async (t) => {
  class Routes {
    @Upgrade()
    somepath() {
      void 0
    }
  }
  const router = new Router({ controllers: [Routes] })
  router.start(mockApp(), midNoop)
  t.equal(router.hasUpgrade, true, 'hasUpgrade is set')
  t.end()
})

t.test('errors without setup (start)', async (t) => {
  const router = new Router()
  t.plan(1)
  try {
    router.middleware
  } catch (e: any) {
    t.equal(e.message, 'Must call start before using the router.')
  }
  t.end()
})

t.test('priority middleware order', async (t) => {
  t.plan(2)

  const second = createAnnotationFactory(
      class {
        middlewarePriority = 'BeforeBodyParser'
        get middleware() {
          return (ctx: any, next: any) => {
            ctx.order += 2
            return next()
          }
        }
      }
    ),
    fourth = createAnnotationFactory(
      class {
        get middleware() {
          return (ctx: any, next: any) => {
            ctx.order += 4
            return next()
          }
        }
      }
    )
  class Routes {
    @Route.Get('/')
    @fourth()
    @second()
    someroute() {
      ctx.order += 5
      t.ok(1)
    }
  }
  const router = new Router({ controllers: [Routes] }),
    context = mockContext('/', 'GET', {}, Routes),
    parse = context.parse,
    ctx = Object.assign(context, { order: '1' })
  ctx.parse = () => {
    ctx.order += 3
    return parse()
  }

  await router.start(mockApp(), midNoop)
  await router.middleware(ctx, () => {
    t.equal(ctx.order, '12345')
    t.end()
  })
})

t.test('with root router', async (t) => {
  t.plan(2)
  const root = new Router(),
    child = new Router()

  class Routes {
    @Route.Get('/')
    someroute() {
      t.ok(1)
    }
  }
  class Routes2 {
    @Route.Get('/sub')
    someroute() {
      t.ok(1)
    }
  }
  root.metadata.add(reflectAnnotations(Routes)[0])
  child.metadata.add(reflectAnnotations(Routes2)[0])

  const app = mockApp()
  await root.start(app, midNoop)
  await child.start(app, midNoop)

  let context = mockContext('/', 'GET', {}, Routes, Routes2)
  await root.middleware(context, noop)
  context = mockContext('/sub', 'GET', {}, Routes, Routes2)
  await child.middleware(context, noop) // does nothing...
  await root.middleware(context, noop)
  t.end()
})
