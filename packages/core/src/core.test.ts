import { Container, Injectable } from '@ingress/di'
import { createAnnotationFactory } from 'reflect-annotations'
import t from 'tap'
import { Ingress, AppState } from './core.js'
import type { Func, Usable } from './types.js'

t.test('usable composition and middleware variations', async (t) => {
  t.plan(20)
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
        t.equal(app, appA)
        app.value += 1
        await next()
        app.value += 6
      },
      async stop(appA: any, next: Func<Promise<void>>) {
        t.equal(app, appA)
        val += 1
        await next()
        val += 6
      },
      async middleware(ctxA: any, next: Func<Promise<void>>) {
        ctx = ctxA
        ctxA.value += 1
        t.ok(ctxA instanceof CtxThing)
        await next()
        ctxA.value += 6
      },
    },
    usable2 = createAnnotationFactory(
      class implements Usable {
        async start(appB: any, next: Func<Promise<void>>) {
          app.value += 2
          t.equal(app, appB)
          await next()
          app.value += 5
        }
        async stop(appB: any, next: Func<Promise<void>>) {
          t.equal(app, appB)
          val += 2
          await next()
          val += 5
        }
        async middleware(ctx: any, next: Func<Promise<void>>) {
          ctx.value += 2
          t.ok(ctx instanceof CtxThing)
          await next()
          ctx.value += 5
        }
      }
    )(),
    usable3 = createAnnotationFactory(
      class {
        async start(appC: any, next: Func<Promise<void>>) {
          t.equal(app, appC)
          app.value += 3
          await next()
          app.value += 4
        }
        async stop(appC: any, next: Func<Promise<void>>) {
          t.equal(app, appC)
          val += 3
          await next()
          val += 4
        }
        async middleware(ctx: any, next: Func<Promise<void>>) {
          ctx.value += 3
          t.ok(ctx instanceof CtxThing)
          await next()
          ctx.value += 4
        }
      }
    )
  let val = ''

  app1.use(usable1)
  app2.use(usable2)
  app3.use(usable3)
  app2.use(app3)
  app1.use(app2)
  await app1.start()
  t.equal(app.value, '123456')
  t.equal(val, '')
  const mw = app.middleware
  await mw()
  t.equal(mw, app.middleware)
  t.equal(app.value, '123456')
  t.equal(ctx.value, '123456')
  t.equal(val, '')
  await app.stop()
  t.equal(app.value, '123456')
  t.equal(ctx.value, '123456')
  t.equal(val, '123456')
  t.equal(app1.container, app2.container)
  t.equal(app2.container, app3.container)
  t.end()
})

t.test('invalid middleware', async (t) => {
  t.plan(3)
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
  t.end()
})

t.test('container option (usable priority)', async (t) => {
  @Injectable()
  class Thing {}
  @Injectable()
  class Thing2 {}
  const thing1s: Thing[] = [],
    thing2s: Thing[] = [],
    app = new Ingress()
  app.use({
    start(app: any, next: Func<Promise<void>>) {
      app.container.registerProvider(Thing)
      app.container.registerSingletonProvider(Thing2)
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
  t.equal(app.readyState, AppState.Started)
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

  const container = new Container()
  container.registerProvider(Thing3)
  container.registerSingletonProvider(Thing4)

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
  t.end()
})

t.test('null prototype context default', async (t) => {
  t.plan(1)
  const app = new Ingress()
  app.use((ctx: any, next: any) => {
    t.equal(Object.getPrototypeOf(ctx), null)
    return next()
  })
  await app.start()
  await app.middleware()
  t.end()
})

t.test('app already started or stopped', async (t) => {
  t.plan(3)
  const app = new Ingress()
  app.use({ middleware: undefined } as any)
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
  t.end()
})
