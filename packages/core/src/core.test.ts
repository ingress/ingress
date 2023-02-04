import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { createContainer, ModuleContainer, Injectable, CoreContext } from './di.js'
import { createAnnotationFactory } from 'reflect-annotations'
import { Ingress, AppState, Middleware, ingress } from './core.js'
import type { Startable, Stoppable, UsableMiddleware } from './types.js'
import type { NextFn } from './compose.js'

describe('core', () => {
  it('usable composition and middleware variations', async () => {
    let plan = 20
    const eql = (a: any, b: any) => {
      expect(a).toEqual(b)
      plan--
    }
    type Ctx = { scope: any; value: string }
    let ctx!: Ctx
    class CtxThing {
      scope: any
      value = ''
    }
    const app1 = new Ingress<Ctx>({ context: new CtxThing() }),
      app2 = ingress<Ctx>(),
      app3 = new Ingress<Ctx>(),
      app = Object.assign(app1, { value: '' }),
      usable1 = {
        async start(appA: any, next: NextFn) {
          eql(app, appA)
          app.value += 1
          await next()
          app.value += 6
        },
        async stop(appA: any, next: NextFn) {
          eql(app, appA)
          val += 1
          await next()
          val += 6
        },
        async middleware(ctxA: any, next: NextFn) {
          ctx = ctxA
          ctxA.value += 1
          expect(ctxA instanceof CtxThing).toBeTruthy()
          plan--
          await next()
          ctxA.value += 6
        },
      },
      usable2 = createAnnotationFactory(
        class implements Startable, Stoppable, UsableMiddleware<any> {
          async start(appB: any, next: NextFn) {
            app.value += 2
            eql(app, appB)
            await next()
            app.value += 5
          }
          async stop(appB: any, next: NextFn) {
            eql(app, appB)
            val += 2
            await next()
            val += 5
          }
          async middleware(ctx: any, next: NextFn) {
            ctx.value += 2
            expect(ctx instanceof CtxThing).toBeTruthy()
            plan--
            await next()
            ctx.value += 5
          }
        }
      )()

    class SomeUsable3 {
      async start(appC: Ctx, next: NextFn) {
        eql(app, appC)
        app.value += 3
        await next()
        app.value += 4
        return { hi: 'hello' }
      }
      async stop(appC: any, next: NextFn) {
        eql(app, appC)
        val += 3
        await next()
        val += 4
      }
      async middleware(ctx: Ctx, next: NextFn) {
        ctx.value += 3
        expect(ctx instanceof CtxThing).toBeTruthy()
        plan--
        await next()
        ctx.value += 4
      }
    }
    const usable3 = createAnnotationFactory(SomeUsable3)
    let val = ''
    app1.use(usable1).use(usable2)
    app3.use(usable3)
    app2.use(app3)
    app1.use(app2)
    await app1.start()
    eql(app.value, '123456')
    eql(val, '')
    const mw = app.middleware
    await mw()
    eql(mw, app.middleware)
    eql(app.value, '123456')
    eql(ctx.value, '123456')
    eql(val, '')
    await app.stop()
    eql(app.value, '123456')
    eql(ctx.value, '123456')
    eql(val, '123456')
    eql(app1.container, app2.container)
    eql(app2.container, app3.container)
    expect(plan).toEqual(0)
  })

  it('base container merge', async () => {
    const container1 = Object.assign(createContainer(), { NAME: 1 }),
      container2 = Object.assign(createContainer(), { NAME: 2 })
    @container1.SingletonService()
    class S1 {}
    @container2.SingletonService
    class S2 {}
    const app = new Ingress({ container: container1 as any })
    app.use(container2)
    app.use((context: any, next: any) => {
      expect(context.scope.get(S2) instanceof S2).toBeTruthy()
      expect(context.scope.get(S1) instanceof S1).toBeTruthy()
      return next()
    })
    await app.start()
    await app.middleware()
  })

  it('invalid middleware', async () => {
    const app = new Ingress()
    expect(() => {
      app.use((context: any) => {
        void context
      })
    }).toThrow('Middleware must accept two arguments, context and next')
    expect(() => {
      app.use({
        middleware() {
          void 0
        },
      })
    }).toThrow('Middleware must accept two arguments, context and next')
    expect(() => {
      app.use({} as any)
    }).toThrow('Unable to use: [object Object]')
  })

  it('module merge', async () => {
    const app = new Ingress(),
      m2 = new ModuleContainer()
    @app.container.SingletonService
    class a {}
    @m2.SingletonService({
      useFactory() {
        return 'abc'
      },
    })
    class b {}
    @m2.Service
    class c {}

    app.use(m2)

    let aa: a, bb: b, cc: c
    const mw: Middleware<any> = (context, next) => {
      if (cc) {
        expect(cc).toEqual(context.scope.get(c))
        expect(cc).not.toBe(context.scope.get(c))
      }
      aa ||= context.scope.get(a)
      bb ||= context.scope.get(b)
      cc ||= context.scope.get(c)
      expect(aa instanceof a).toBeTruthy()
      expect(bb).toBe('abc')
      expect(cc instanceof c).toBeTruthy()
      expect(aa).toEqual(context.scope.get(a))
      expect('abc').toEqual(context.scope.get(b))
      return next()
    }
    app.use(mw)
    await app.start()
    await app.middleware()
    await app.middleware()
    await app.stop()
  })

  it('nested unUse', async () => {
    let plan = 0
    const a = new Ingress(),
      b = new Ingress()
    a.use({
      start() {
        return Promise.resolve()
      },
      middleware(context: any, next: any) {
        plan++
        return next()
      },
    })
    b.use({
      start(app: any, next: any) {
        app.unUse(this)
        expect(() => app.unUse(this)).toThrow("Unable to unUse an addon that has not been use'd")
        plan++
        return next()
      },
      middleware(context: any, next: any) {
        plan++
        expect(true).toBe(false)
        return next()
      },
    })
    a.use(b)
    await a.start()
    await a.middleware()
    await a.stop()
    expect(plan).toEqual(2)
  })

  it('null prototype context default', async () => {
    let plan = 0
    const app = new Ingress(),
      b = app.use((ctx: { wat: boolean }, next: any) => {
        plan++
        expect(Object.getPrototypeOf(ctx)).toEqual(null)
        return next()
      })
    void b
    await app.start()
    await app.middleware()
    expect(1).toEqual(plan)
  })

  it('app already started or stopped', async () => {
    //t.plan(3)
    const app = new Ingress()
    app.use({ middleware: (context: any, next: any) => next() })
    await app.start()
    await app.start().catch((e) => expect(e.message).toEqual('Already started or starting'))
    expect(() =>
      app.use({
        start(_: any, next: NextFn) {
          return next()
        },
      })
    ).toThrow('Already started, Cannot "use" now')
    await app.stop()
    await app.stop().catch((e) => expect(e.message).toEqual('Already stopped or stopping'))
  })

  it('registerDriver', async () => {
    //t.plan(6)
    const app = new Ingress(),
      handle = Symbol('something')
    app.registerDriver(handle, async () => {
      expect(app.readyState & AppState.Started).toBeTruthy()
      await Promise.resolve()
      expect(app.readyState & AppState.Started).toBeTruthy()
    })
    expect(() => {
      app.registerDriver(handle, () => {
        void 0
      })
    }).toThrow('Driver already registered')
    expect(app.readyState === AppState.New).toBeTruthy()
    const starting = app.start()
    expect(app.readyState & AppState.Starting).toBeTruthy()
    await starting
    expect(app.driver).toEqual(handle)
    expect(app.readyState & AppState.Started).toBeTruthy()
    await app.run()
    expect(app.readyState & AppState.Running).toBeTruthy()
  })

  it('run', async () => {
    const app = new Ingress()
    await app.run()
    await app.stop()
    try {
      await app.run()
      throw 'should have thrown'
    } catch (err: any) {
      expect(err.message).toBe('Cannot run a stopped app')
    }
  })

  it('passed module container', async () => {
    @Injectable()
    class Thing {}
    @Injectable()
    class Thing2 {}
    const thing1s: Thing[] = [],
      thing2s: Thing[] = [],
      app = new Ingress()
    app.use({
      start(app: any, next: NextFn) {
        app.container.registerScoped(Thing)
        app.container.registerSingleton(Thing2)
        return next()
      },
      middleware(ctx: any, next: NextFn) {
        thing1s.push(ctx.scope.get(Thing))
        thing2s.push(ctx.scope.get(Thing2))
        return next()
      },
    })
    expect(app.readyState === AppState.New).toBeTruthy()
    await app.start()
    expect(app.readyState & AppState.Running).toBeTruthy()
    await app.middleware()
    await app.middleware()

    expect(thing1s.length).toEqual(2)
    expect(thing1s[0] instanceof Thing).toBeTruthy()
    expect(thing1s[1] instanceof Thing).toBeTruthy()
    expect(thing1s[0] !== thing1s[1]).toBeTruthy()
    expect(thing2s[0] instanceof Thing2).toBeTruthy()
    expect(thing2s[1] instanceof Thing2).toBeTruthy()
    expect(thing2s[0]).toEqual(thing2s[1])

    @Injectable()
    class Thing3 {}
    @Injectable()
    class Thing4 {}

    const container = new ModuleContainer()
    container.registerScoped(Thing3)
    container.registerSingleton(Thing4)

    const thing3s: Thing3[] = [],
      thing4s: Thing4[] = [],
      app1 = new Ingress({ container })
    app1.use((ctx: any, next: any) => {
      thing3s.push(ctx.scope.get(Thing3))
      thing4s.push(ctx.scope.get(Thing4))
      return next()
    })
    await app1.start()
    await app1.middleware()
    await app1.middleware()

    expect(thing3s[0] instanceof Thing3).toBeTruthy()
    expect(thing3s[1] instanceof Thing3).toBeTruthy()
    expect(thing3s[0] !== thing3s[1]).toBeTruthy()
    expect(thing4s[0] instanceof Thing4).toBeTruthy()
    expect(thing4s[1] instanceof Thing4).toBeTruthy()
    expect(thing2s[0]).toEqual(thing2s[1])
  })

  it('decorations and extensions', async () => {
    const app = new Ingress()
    class SomeUsable {
      initializeContext(ctx: CoreContext) {
        return Object.assign(ctx, { a: 'b' })
      }
      async start(app: Ingress<ReturnType<(typeof this)['initializeContext']>>, next: NextFn) {
        await next()
        return {
          some: 'decoration',
        }
      }
    }

    const annotationFactory = createAnnotationFactory(SomeUsable),
      annotation = annotationFactory(),
      factoryApp = new Ingress()
    factoryApp.use(annotation)
    const app1 = app.use(new SomeUsable()),
      app2 = app1.use((ctx, nxt) => {
        void ctx.a
        return nxt()
      }),
      started = await app2.start()
    expect(started.some).toEqual('decoration')
  })

  it('custom driver', () => {
    type UsableContext = CoreContext & { some: 'prop' }
    class Usable {
      initializeContext(ctx: UsableContext) {
        return ctx
      }
      start(app: Ingress<any>, next: NextFn) {
        return next()
      }
      middleware(ctx: UsableContext, next: NextFn) {
        return next()
      }
    }
    const app = new Ingress(),
      res = app.use(new Usable())
    void res
  })
})
// initializeContext
// initializeContext, start
// initializeContext, stop
// initializeContext, start, stop, middleware
// start
// start, stop
// start, stop, middleware
// stop
// stop, middleware,
