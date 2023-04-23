import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { NextFn } from './core.js'
import { Ingress } from './core.js'
import { forTest } from './di.js'

describe('Collectors', () => {
  it('UseSingleton', async () => {
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
        expect(this).toBe(app.container.get(A))
        plan++
      }
    }

    await app.start()
    expect(plan).toBe(1)
    await app.middleware()
    await app.middleware()
    await app.stop()
    expect(plan).toBe(4)
  })

  it('UseSingleton priority', async () => {
    const app = new Ingress(),
      UseSingleton = app.container.UseSingleton
    let plan = ''
    class WontBeFirst {
      middleware(_: any, next: NextFn) {
        plan += 'd'
        return next()
      }
    }
    app.use(new WontBeFirst())
    @UseSingleton({ priority: { before: WontBeFirst } })
    class A {
      middleware(context: any, next: any) {
        plan += 'c'
        return next()
      }
    }
    @UseSingleton({ priority: { before: A } })
    class B {
      middleware(context: any, next: any) {
        plan += 'a'
        return next()
      }
    }

    @UseSingleton({ priority: { after: B } })
    class C {
      middleware(context: any, next: any) {
        plan += 'b'
        return next()
      }
    }

    await app.start()
    await app.middleware()
    await app.stop()
    expect(plan).toBe('abcd')
  })

  it('Singleton', async () => {
    const app = new Ingress(),
      Singleton = app.container.SingletonService

    @Singleton
    class A {}
    let lastA: A | null = null,
      plan = 0
    app.use({
      middleware(context: any, next: any) {
        if (lastA) {
          expect(lastA).toBe(context.scope.get(A))
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
    expect(plan).toBe(2)
  })
  it('Service', async () => {
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
          expect(thisA).not.toBe(lastA)
          expect(lastA instanceof A).toBe(true)
          expect(thisA instanceof A).toBe(true)
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
    expect(plan).toBe(2)
  })

  it('forTest provider', async () => {
    const app = new Ingress(),
      Service = app.container.Service

    class MockA {
      hello = 'test provider'
    }
    process.env.NODE_ENV = 'development'
    @Service(forTest({ useClass: MockA }))
    class A {
      hello = 'real provider'
    }
    let plan = 0
    app.use({
      middleware(context: any, next: any) {
        const thisA = context.scope.get(A)
        expect(thisA).toEqual({ hello: 'real provider' })
        plan++
        return next()
      },
    })

    await app.run()
    await app.middleware()
    await app.stop()
    expect(plan).toBe(1)

    const app2 = new Ingress()
    class MockB {
      hello = 'test provider'
    }

    const setTest = () => {
      process.env.NODE_ENV = 'test'
      return forTest({ useClass: MockB })
    }

    @app2.container.Service(setTest())
    class B {
      hello = 'real provider'
    }
    app2.use({
      middleware(context: any, next: any) {
        const thisB = context.scope.get(B)
        expect(thisB).toEqual({ hello: 'test provider' })
        plan++
        return next()
      },
    })

    await app2.run()
    await app2.middleware()
    await app2.stop()
    expect(plan).toBe(2)
  })
})
