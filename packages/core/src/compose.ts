import type { Func } from './di.js'

export interface Middleware<T, R = any> {
  (context: T, next: ContinuationMiddleware<T, R>): R
}

export type NextFn = ContinuationMiddleware<any, void>

export interface ContinuationMiddleware<T = any, R = any> {
  (context?: T, next?: Middleware<T, R>): R
}
export interface StartingMiddleware<T, R = any> {
  (context: T, next?: Middleware<T, R>): R
}

/**
 * Checks to see if a function is a middleware function
 * @param value
 * @returns
 */
export function isMiddlewareFunction(value: any): value is Func {
  return typeof value === 'function' && value.toString().indexOf('class') !== 0
}

const defaultExecutor = (func: Func, ctx: any, next: any) => func(ctx, next),
  noopNext = () => void 0

/**
 * Take a snapshot of middleware and return a function to invoke all with a single argument <T>context
 * @param middleware
 */
export function compose<T = any>(...middleware: Middleware<T>[]): StartingMiddleware<T> {
  for (const x of middleware) {
    if (!isMiddlewareFunction(x)) {
      throw new TypeError(`${x}, must be a middleware function accepting (context, next) arguments`)
    }
  }
  return (ctx, next) => {
    return exec(middleware, ctx as T, next, defaultExecutor)
  }
}

/**
 * Execute a growable array of middleware
 *
 * @param ctx
 * @param mw
 * @param last ContinuationMiddleware
 * @returns
 */
export function exec<T>(
  mw: any[],
  ctx: T,
  next: Middleware<T> | undefined = noopNext,
  executor: Func<any, any> | undefined = defaultExecutor
): Promise<void> | void {
  let i = -1
  const nxt = (): void | Promise<void> => {
    if (++i < mw.length) {
      return executor(mw[i], ctx, nxt)
    } else if (next) {
      return next(ctx, noopNext)
    }
  }
  return nxt()
}

export function executeByArity(
  prop: string,
  results: any[] | undefined,
  usable: any,
  ctx: any,
  next: any = noopNext
) {
  if (usable?.[prop]) {
    if (usable[prop].length >= 2) {
      const res = usable[prop](ctx, next)
      if (res && results) results.push(res)
      return res
    }
    const nxt = wrapNext(next),
      result = usable[prop](ctx, nxt)
    if (result && results) results.push(result)
    if (typeof result?.then === 'function') return result.then(nxt)
    return nxt()
  }
  const last = next()
  last && results?.push(last)
  return last
}

function wrapNext(fn: Func | null) {
  return function () {
    if (fn) {
      const result = fn()
      fn = null
      return result
    }
    throw new Error('next should be an explicit argument')
  }
}
