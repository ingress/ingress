import 'reflect-metadata'
import createContainer, { Func, ModuleContainer, Injectable } from './di.js'
import { createAnnotationFactory } from 'reflect-annotations'
import { test } from 'uvu'
import * as t from 'uvu/assert'
import { Ingress, AppState, Middleware } from './core.js'
import type { Usable } from './types.js'

test('usable composition and middleware variations', async () => {
  //t.plan(20)
  let plan = 20
  const eql = (a: any, b: any) => {
    t.equal(a, b)
    plan--
  }
  type Ctx = { scope: any; value: string }
  let ctx!: Ctx
  class CtxThing {
    scope: any
    value = ''
  }
  const app1 = new Ingress<Ctx>({ context: new CtxThing() }),
    app2 = new Ingress<Ctx>(),
    app3 = new Ingress<Ctx>(),
    app = Object.assign(app1, { value: '' }),
    usable1 = {
      async start(appA: any, next: Func<Promise<void>>) {
        eql(app, appA)
        app.value += 1
        await next()
        app.value += 6
      },
      async stop(appA: any, next: Func<Promise<void>>) {
        eql(app, appA)
        val += 1
        await next()
        val += 6
      },
      async middleware(ctxA: any, next: Func<Promise<void>>) {
        ctx = ctxA
        ctxA.value += 1
        t.ok(ctxA instanceof CtxThing)
        plan--
        await next()
        ctxA.value += 6
      },
    },
    usable2 = createAnnotationFactory(
      class implements Usable {
        async start(appB: any, next: Func<Promise<void>>) {
          app.value += 2
          eql(app, appB)
          await next()
          app.value += 5
        }
        async stop(appB: any, next: Func<Promise<void>>) {
          eql(app, appB)
          val += 2
          await next()
          val += 5
        }
        async middleware(ctx: any, next: Func<Promise<void>>) {
          ctx.value += 2
          t.ok(ctx instanceof CtxThing)
          plan--
          await next()
          ctx.value += 5
        }
      }
    )(),
    usable3 = createAnnotationFactory(
      class {
        async start(appC: any, next: Func<Promise<void>>) {
          eql(app, appC)
          app.value += 3
          await next()
          app.value += 4
        }
        async stop(appC: any, next: Func<Promise<void>>) {
          eql(app, appC)
          val += 3
          await next()
          val += 4
        }
        async middleware(ctx: any, next: Func<Promise<void>>) {
          ctx.value += 3
          t.ok(ctx instanceof CtxThing)
          plan--
          await next()
          ctx.value += 4
        }
      }
    )
  let val = ''

  app1.use(usable1, usable2)
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
  t.is(plan, 0)
})

test('base container merge', async () => {
  const container1 = Object.assign(createContainer(), { NAME: 1 }),
    container2 = Object.assign(createContainer(), { NAME: 2 })
  @container1.SingletonService
  class S1 {}
  @container2.SingletonService
  class S2 {}
  const app = new Ingress({ container: container1 as any })
  app.use(container2)
  app.use((context: any, next: any) => {
    t.ok(context.scope.get(S2) instanceof S2)
    t.ok(context.scope.get(S1) instanceof S1)
    return next()
  })
  await app.start()
  await app.middleware()
})

test('invalid middleware', async () => {
  //t.plan(3)
  const app = new Ingress()
  t.throws(() => {
    app.use(() => {
      void 0
    })
  }, 'Middleware must accept two arguments, context and next')
  t.throws(() => {
    app.use({
      middleware() {
        void 0
      },
    })
  }, 'Middleware must accept two arguments, context and next')
  t.throws(() => {
    app.use({} as any)
  }, 'Unable to use: [Object object]')
})

test('module merge', async () => {
  const app = new Ingress(),
    m2 = new ModuleContainer()
  @app.container.SingletonService
  class a {}
  @m2.SingletonService
  class b {}
  @m2.Service
  class c {}

  app.use(m2)

  let aa: a, bb: b, cc: c
  const mw: Middleware<any> = (context, next) => {
    if (cc) {
      t.is.not(cc, context.scope.get(c))
    }
    aa ||= context.scope.get(a)
    bb ||= context.scope.get(b)
    cc ||= context.scope.get(c)
    t.ok(aa instanceof a)
    t.ok(bb instanceof b)
    t.ok(cc instanceof c)
    t.equal(aa, context.scope.get(a))
    t.equal(bb, context.scope.get(b))
    return next()
  }
  app.use(mw)
  await app.start()
  await app.middleware()
  await app.middleware()
  await app.stop()
})

test('null prototype context default', async () => {
  //t.plan(1)
  const app = new Ingress()
  app.use((ctx: any, next: any) => {
    t.equal(Object.getPrototypeOf(ctx), null)
    return next()
  })
  await app.start()
  await app.middleware()
})

test('app already started or stopped', async () => {
  //t.plan(3)
  const app = new Ingress()
  app.use({ middleware: (context: any, next: any) => next() })
  await app.start()
  await app.start().catch((e) => t.equal(e.message, 'Already started or starting'))
  t.throws(
    () =>
      app.use({
        start(_: any, next: Func<Promise<any>>) {
          return next()
        },
      }),
    'Already started, Cannot "use" something now'
  )
  await app.stop()
  await app.stop().catch((e) => t.equal(e.message, 'Already stopped or stopping'))
})

test('registerDriver', async () => {
  //t.plan(6)
  const app = new Ingress(),
    handle = Symbol('something')
  app.registerDriver(handle, async () => {
    t.equal(app.readyState, AppState.Started, 'Started')
    await Promise.resolve()
    t.equal(app.readyState, AppState.Running, 'Running')
  })
  t.throws(() => {
    app.registerDriver(handle, () => {
      void 0
    })
  }, 'Driver already registered')
  t.equal(app.readyState, AppState.New, 'New')
  await app.start()
  t.equal(app.driver, handle)
  t.equal(app.readyState, AppState.Started, 'Started')
  await app.run()
  t.equal(app.readyState, AppState.Running)
})

test('run', async () => {
  const app = new Ingress()
  await app.run()
  await app.stop()
  try {
    await app.run()
    t.unreachable('should have thrown')
  } catch (err: any) {
    t.match(err.message, 'Cannot run a stopped app')
  }
})

test('passed module container', async () => {
  @Injectable()
  class Thing {}
  @Injectable()
  class Thing2 {}
  const thing1s: Thing[] = [],
    thing2s: Thing[] = [],
    app = new Ingress()
  app.use({
    start(app: any, next: Func<Promise<void>>) {
      app.container.registerScoped(Thing)
      app.container.registerSingleton(Thing2)
      return next()
    },
    middleware(ctx: any, next: Func<Promise<void>>) {
      thing1s.push(ctx.scope.get(Thing))
      thing2s.push(ctx.scope.get(Thing2))
      return next()
    },
  })
  t.equal(app.readyState, AppState.New)
  await app.start()
  t.equal(app.readyState, AppState.Running)
  await app.middleware()
  await app.middleware()

  t.equal(thing1s.length, 2)
  t.ok(thing1s[0] instanceof Thing)
  t.ok(thing1s[1] instanceof Thing)
  t.ok(thing1s[0] !== thing1s[1])
  t.ok(thing2s[0] instanceof Thing2)
  t.ok(thing2s[1] instanceof Thing2)
  t.equal(thing2s[0], thing2s[1])

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

  t.ok(thing3s[0] instanceof Thing3)
  t.ok(thing3s[1] instanceof Thing3)
  t.ok(thing3s[0] !== thing3s[1])
  t.ok(thing4s[0] instanceof Thing4)
  t.ok(thing4s[1] instanceof Thing4)
  t.equal(thing2s[0], thing2s[1])
})

test.run()
