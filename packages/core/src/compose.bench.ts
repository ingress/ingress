import { BenchmarkBuilder, Measurement } from 'photofinish'
import { test } from 'uvu'
import { exec, Middleware } from './compose.js'

function logOps(name: string, num: Measurement) {
  const ops = num.getOpsPerSec(),
    fixed = ops.toFixed()
  console.log(name + ' OPS/s ' + Number(fixed).toLocaleString())
}
test('sync exec performance', async () => {
  const sync: Middleware<any>[] = [
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
    ],
    fn = () => exec(sync, {}) as any,
    bb = new BenchmarkBuilder(),
    b = bb
      .benchmarkName('sync exec')
      .warmupCycles(40000)
      .benchmarkCycles(80000)
      .asyncFunctionUnderTest(fn)
      .build(),
    result = await b.executeAsync()
  logOps('Sync Exec', result.meanTime)
})

test('sparse sync exec performance', async () => {
  const sparse: (undefined | Middleware<any>)[] = [
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      void 0,
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      void 0,
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      (context, next) => {
        return next()
      },
      void 0,
      (context, next) => {
        return next()
      },
    ],
    executor = (fn: any, context: any, next: any) => {
      return fn ? fn(context, next) : next()
    },
    fn = () => exec(sparse, {}, undefined, executor) as any,
    bb = new BenchmarkBuilder(),
    b = bb
      .benchmarkName('sparse sync exec')
      .warmupCycles(40000)
      .benchmarkCycles(80000)
      .asyncFunctionUnderTest(fn)
      .build(),
    result = await b.executeAsync()

  logOps('Sparse Sync', result.meanTime)
})

test('async exec performance', async () => {
  const notSparse: Middleware<any>[] = [
      async (context, next) => {
        await Promise.resolve()
        return next()
      },
      (context, next) => {
        return next()
      },
      async (context, next) => {
        await Promise.resolve()
        return next()
      },
      (context, next) => {
        return next()
      },
      async (context, next) => {
        await Promise.resolve()
        return next()
      },
      (context, next) => {
        return next()
      },
      async (context, next) => {
        await Promise.resolve()
        return next()
      },
      (context, next) => {
        return next()
      },
    ],
    fn = () => exec(notSparse, {}) as any,
    bb = new BenchmarkBuilder(),
    b = bb
      .benchmarkName('async exec')
      .warmupCycles(40000)
      .benchmarkCycles(80000)
      .asyncFunctionUnderTest(fn)
      .build(),
    result = await b.executeAsync()
  logOps('Async Exec', result.meanTime)
})

test.run()
