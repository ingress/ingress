//Testing
import { describe, it, expect } from 'vitest'
import { inject } from '@hapi/shot'

//Deps
import 'reflect-metadata'
import type { CoreContext } from '@ingress/core'
import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { createAnnotationFactory } from 'reflect-annotations'

//under test
import { Router, Route, readUrl } from './router.js'
import { MiddlewarePriority } from './handler.js'
import { PathParamAnnotation, RouteAnnotation } from './annotations/route.annotation.js'

describe('router', () => {
  it('readUrl', () => {
    expect(readUrl('/hello/world?whats=up')).toEqual(['/hello/world', '?whats=up'])
    expect(readUrl('/hello/world#whats=up')).toEqual(['/hello/world', '?whats=up'])
    expect(readUrl('/hello/world;whats=up')).toEqual(['/hello/world', '?whats=up'])
    expect(readUrl('')).toEqual(['/', ''])
  })

  it('Route miss', async () => {
    const router = new Router(),
      app = new Ingress<any>().use(new Http()).use(router)
    await app.start()
    const response = await inject(app.driver, {
      method: 'GET',
      url: '/',
    })
    expect(response.statusCode).toEqual(404)
  })

  it('Route hit+query', async () => {
    const router = new Router(),
      app = new Ingress<any>().use(new Http()).use(router)

    await app.start()

    router.on('GET', '/some/route', (c: any, next: any) => {
      expect(c.request.searchParams.get('some')).toEqual('query')
      expect(c.request.search).toEqual('?some=query')
      return next()
    })

    const response = await inject(app.driver, {
      url: '/some/route?some=query',
      method: 'GET',
    })

    expect(response.statusCode).toEqual(200)
  })

  it('Route Execution with Annotations', async () => {
    const router = new Router(),
      secret = Math.random().toString()
    @router.Controller('parent')
    class Routes {
      @Route.Get('/child', 'PUT', Route.Post)
      someRoute() {
        return secret
      }
    }
    void Routes
    const app = new Ingress<any>().use(new Http()).use(router)
    await app.start()
    const response = await inject(app.driver, {
      method: 'PUT',
      url: '/parent/child',
    })
    expect(response.statusCode).toEqual(200)
  })

  it('Route with plain Metadata', async () => {
    const router = new Router()
    let called = false
    class Routes {
      otherRoute(variable: string) {
        expect(variable).toEqual('something')
        called = true
      }
    }
    router.metadata.add({
      controllerAnnotations: [new RouteAnnotation('parent')],
      methodAnnotations: [new RouteAnnotation('child2/:variable', 'GET')],
      parameterAnnotations: [new PathParamAnnotation('variable')],
      types: { parameters: [] },
      name: 'otherRoute',
      controller: Routes,
    })

    const app = new Ingress().use(new Http()).use(router)
    await app.start()
    const response = await inject(app.driver, {
      url: '/parent/child2/something',
    })

    expect(called).toEqual(true)
    expect(response.statusCode).toEqual(200)
  })

  it('accepts upgrade route', async () => {
    class Routes {
      @Route.Upgrade('connect')
      somePath() {
        void 0
      }
    }
    const router = new Router({ routes: [Routes] }),
      app = new Ingress<any>().use(router)
    await app.start()
    expect(router.hasUpgrade).toEqual(true)
  })

  it('priority middleware order', async () => {
    const second = createAnnotationFactory(
        class {
          middlewarePriority = MiddlewarePriority.BeforeBodyParser
          middleware(ctx: any, next: any) {
            ctx.order += 2
            return next()
          }
        }
      ),
      third = createAnnotationFactory(
        class {
          middleware(ctx: any, next: any) {
            ctx.order += 3
            return next()
          }
        }
      )
    class Routes {
      @Route.Get('/')
      @third()
      @second()
      someRoute({ context }: any) {
        context.order += 4
        return context.order
      }
    }
    const app = new Ingress()
      .use({
        initializeContext(ctx: CoreContext & { order: string }) {
          ctx.order = '1'
          return ctx
        },
      })
      .use(new Http())
      .use(new Router({ routes: [Routes] }))
    await app.start()
    const response = await inject(app.driver, {
      method: 'GET',
      url: '/',
    })

    expect(response.payload).toEqual('1234')
  })

  it('should decorate the ingress instance', async () => {
    const router = new Router(),
      decorated = new Ingress().use(router),
      app = await decorated.start()
    expect(app.router).toEqual(router)
  })

  it('with more than one router', async () => {
    let plan = ''
    const a = new Router(),
      b = new Router(),
      c = new Router()

    class Routes {
      @Route.Get('/')
      someRouteA() {
        plan += 'someRouteA'
      }
    }
    class Routes2 {
      @Route.Get('/sub')
      someRoute() {
        plan += ' someRouteB'
      }
    }
    class Routes3 {
      @Route.Get('/sub/sub')
      someRoute() {
        plan += ' someRouteC'
      }
    }
    a.registerRouteClass(Routes)
    b.registerRouteClass(Routes2)
    c.registerRouteClass(Routes3)

    const app = new Ingress<any>().use(new Http()).use(a).use(b).use(c)
    await app.start()
    for (const url of ['/', '/sub', '/sub/sub']) {
      await inject(app.driver, {
        method: 'GET',
        url,
      })
    }
    expect(plan).toEqual('someRouteA someRouteB someRouteC')
  })
})
