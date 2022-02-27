import { compose, Middleware, exec } from './core.js'
import { test } from 'uvu'
import * as t from 'uvu/assert'

test('can short circuit', async () => {
  const m = { count: 0 }
  await compose(
    async (x: any) => {
      x.count++
    },
    async (x: any) => {
      x.count++
    }
  )(m)
  t.equal(m.count, 1)
})

test('works', async () => {
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
  t.equal(str, '123')
})

test('can run concurrently', async () => {
  let first = true
  const composed = compose(async (x: any, next: any) => {
    if (first) {
      first = false
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    await next()
  })
  await Promise.all([composed(), composed()])
})

test('is valid middleware', async () => {
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

  t.equal(context.str, '12345')
})

test('errors', () => {
  t.throws(() => compose('a' as any))
})

test('propagates errors from middleware', async () => {
  const someError = new Error(Math.random().toString())
  function doThrow() {
    throw someError
  }
  let didError = false
  try {
    await compose(() => {
      doThrow()
      return Promise.resolve()
    })()
  } catch (error) {
    didError = true
    t.equal(error, someError)
  }
  t.ok(didError)
})

test('exec', async () => {
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
  t.equal(ctx.value, '123L456')
})

test('exec shrink', async () => {
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
  t.equal(ctx.value, '123L456')
})

test.run()
