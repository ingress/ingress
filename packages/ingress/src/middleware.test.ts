import { describe, it, expect } from 'vitest'
import type { NextFn } from './ingress.js'
import ingress, { Http, forwardRef } from './ingress.js'
import { inject } from '@hapi/shot'

describe('ingress', () => {
  it('middleware', async () => {
    const app = ingress(),
      { Route, Routes, UseSingleton } = app

    type Thing = { abc?: string }

    @UseSingleton({
      priority: {
        after: forwardRef(() => MiddlewareThing),
      },
    })
    class MiddlewareThingB {
      middleware(ctx: Thing, next: NextFn) {
        ctx.abc += '2'
        return next()
      }
    }

    @UseSingleton({ priority: { before: Http } })
    class MiddlewareThing {
      middleware(ctx: Thing, next: NextFn) {
        ctx.abc = '1'
        return next()
      }
    }

    @Routes('/')
    class Greet {
      @Route.Get('hello')
      greet({ context }: { context: Thing }) {
        context.abc += '3'
        return context.abc
      }
    }

    await app.start()

    const response = await inject(app.driver, '/hello')
    expect(response.statusCode).toEqual(200)
    expect(response.payload).toEqual('123')
  })
})
