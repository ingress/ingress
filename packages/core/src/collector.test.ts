import { test } from 'uvu'
import * as t from 'uvu/assert'
import { Ingress } from './core.js'

test('UseSingleton Collector', async () => {
  const app = new Ingress(),
    UseSingleton = app.container.UseSingleton

  let plan = 0

  @UseSingleton
  class A {
    start() {
      plan++
    }
    middleware(context: any, next: any) {
      plan++
      return next()
    }
    stop(app: any) {
      t.equal(this, app.container.get(A))
      plan++
    }
  }
  await app.start()
  t.equal(plan, 1)
  await app.middleware()
  await app.middleware()
  await app.stop()
  t.equal(plan, 4)
})

test('Singleton Collector', async () => {
  const app = new Ingress(),
    Singleton = app.container.SingletonService

  @Singleton
  class A {}
  let lastA: A | null = null,
    plan = 0
  app.use({
    middleware(context: any, next: any) {
      if (lastA) {
        t.is(lastA, context.scope.get(A))
        plan++
      } else plan++
      lastA = context.scope.get(A)
      return next()
    },
  })

  await app.run()
  await app.middleware()
  await app.middleware()
  await app.stop()
  t.equal(plan, 2)
})

test('Service Collector', async () => {
  const app = new Ingress(),
    Service = app.container.Service

  @Service
  class A {}
  let lastA: A | null = null,
    plan = 0
  app.use({
    middleware(context: any, next: any) {
      if (lastA) {
        const thisA = context.scope.get(A)
        t.is.not(lastA, thisA)
        t.instance(lastA, A)
        t.instance(thisA, A)
        plan++
      } else {
        plan++
      }
      lastA = context.scope.get(A)
      return next()
    },
  })

  await app.run()
  await app.middleware()
  await app.middleware()
  await app.stop()
  t.equal(plan, 2)
})

test.run()
