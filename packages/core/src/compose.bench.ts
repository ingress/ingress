import { BenchmarkBuilder } from 'photofinish'
import { test } from 'uvu'

import { exec, Middleware } from './compose.js'

test('bare exec performance', async () => {
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
    b = bb.benchmarkName('non sparce exec').asyncFunctionUnderTest(fn).build(),
    result = await b.executeAsync()
  console.log(result)
  console.log(result.meanTime.getOpsPerSec())
})

test('sparse exec performance', async () => {
  const sparse: (undefined | Middleware<any>)[] = [
      async (context, next) => {
        await Promise.resolve()
        return next()
      },
      (context, next) => {
        return next()
      },
      void 0,
      async (context, next) => {
        await Promise.resolve()
        return next()
      },
      (context, next) => {
        return next()
      },
      void 0,
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
    b = bb.benchmarkName('sparse exec').asyncFunctionUnderTest(fn).build(),
    result = await b.executeAsync()
  console.log(result)
  console.log(result.meanTime.getOpsPerSec())
})

test.run()
