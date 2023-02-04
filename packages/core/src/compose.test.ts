import { compose, Middleware, exec } from './core.js'
import { describe, it, expect } from 'vitest'
import { executeByArity } from './compose.js'

describe('compose', () => {
  it('can short circuit', async () => {
    const m = { count: 0 }
    await compose(
      async (x: any) => {
        x.count++
      },
      async (x: any) => {
        x.count++
      }
    )(m)
    expect(m.count).toBe(1)
  })

  it('works', async () => {
    let str = ''
    await compose(
      async (x: any, next: any) => {
        str += 1
        await next()
        str += 3
      },
      async (x: any, next: any) => {
        await next()
        str += 2
      }
    )({})
    expect(str).toBe('123')
  })
  it('can run concurrently', async () => {
    let first = true
    const composed = compose(async (x: any, next: any) => {
      if (first) {
        first = false
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      await next()
    })
    await Promise.all([composed({}), composed({})])
  })
  it('is valid middleware', async () => {
    const context = { str: '' },
      func = compose<typeof context>(
        async function (ctx, next) {
          ctx.str += 1
          await next()
          ctx.str += 5
        },
        async function (ctx, next) {
          ctx.str += 2
          await next()
          ctx.str += 4
        }
      )

    await func(context, (ctx, next) => {
      ctx.str += 3
      return next()
    })

    expect(context.str).toBe('12345')
  })
  it('errors', () => {
    expect(() => compose('a' as any)).toThrow()
  })
  it('propagates errors from middleware', async () => {
    const someError = new Error(Math.random().toString())
    function doThrow() {
      throw someError
    }
    let didError = false
    try {
      await compose(() => {
        doThrow()
        return Promise.resolve()
      })({})
    } catch (error) {
      didError = true
      expect(error).toBe(someError)
    }
    expect(didError).toBe(true)
  })
  it('exec', async () => {
    const mws: Middleware<any>[] = [
        async (ctx, next) => {
          ctx.value += 1
          await next()
          ctx.value += 6
        },
        async (ctx, next) => {
          ctx.value += 2
          mws.push(async (ctx, next) => {
            ctx.value += 3
            await next()
            ctx.value += 4
          })
          await next()
          ctx.value += 5
        },
      ],
      ctx = { value: '' },
      last = async (ctx: any, next: any) => {
        ctx.value += 'L'
        return next()
      }
    await exec(mws, ctx, last)
    expect(ctx.value).toBe('123L456')
  })
  it('exec shrink', async () => {
    const mws: Middleware<any>[] = [
        async (ctx, next) => {
          ctx.value += 1
          await next()
          ctx.value += 6
        },
        async (ctx, next) => {
          mws.splice(1, 1, void 0 as any) // remove self
          ctx.value += 2
          await next()
          ctx.value += 5
        },
        async (ctx, next) => {
          ctx.value += 3
          await next()
          ctx.value += 4
        },
        (ctx: any, next: any) => {
          ctx.value += 'L'
          return next()
        },
      ],
      ctx = { value: '' }
    await exec(mws, ctx)
    expect(ctx.value).toBe('123L456')
  })
  it('execute by arity', async () => {
    let plan = 0
    await executeByArity(
      'func',
      undefined,
      {
        func() {
          plan++
          return Promise.resolve()
        },
      },
      {},
      () => {
        plan++
      }
    )
    expect(plan).toBe(2)
    await executeByArity(
      'missing',
      undefined,
      {
        func() {
          plan++
          return Promise.resolve()
        },
      },
      {},
      () => {
        plan++
      }
    )
    expect(plan).toBe(3)
  })
})
