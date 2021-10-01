import { compose, Middleware, exec } from './core.js'
import t from 'tap'

t.test('can short circuit', async (t) => {
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
  t.end()
})

t.test('works', async (t) => {
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
  t.end()
})

t.test('can run concurrently', async (t) => {
  let first = true
  const composed = compose(async (x: any, next: any) => {
    if (first) {
      first = false
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    await next()
  })
  await Promise.all([composed(), composed()])
  t.end()
})

t.test('is valid middleware', async (t) => {
  const context = { str: '' },
    func = compose<typeof context>([
      async function (ctx, next) {
        ctx.str += 1
        await next()
        ctx.str += 5
      },
      async function (ctx, next) {
        ctx.str += 2
        await next()
        ctx.str += 4
      },
    ])

  await func(context, (ctx, next) => {
    ctx.str += 3
    return next()
  })

  t.equal(context.str, '12345')
  t.end()
})

t.test('errors', (t) => {
  t.throws(() => compose('a' as any))
  t.end()
})

t.test('propagates errors from middleware', async (t) => {
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
  t.end()
})

t.test('exec', async (t) => {
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
  await exec(ctx, mws, last)
  t.equal(ctx.value, '123L456')
  t.end()
})
