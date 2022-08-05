import type { Func } from './di'

export interface Middleware<T, R = any> {
  (context: T, next: ContinuationMiddleware<T, R>): R | Promise<R>
}
export interface ContinuationMiddleware<T, R = any> {
  (context?: T, next?: Middleware<T, R>): R | Promise<R>
}
export interface StartingMiddleware<T, R = any> {
  (context: T, next?: Middleware<T, R>): R | Promise<R>
}

/**
 * Checks to see if a function is a middleware function
 * Don't use in the hotpath
 * @param value
 * @returns
 */
export function isMiddlewareFunction(value: any): value is Func {
  return typeof value === 'function' && value.toString().indexOf('class') !== 0
}

const defaultExecutor = (func: Func, ctx: any, next: any) => func(ctx, next),
  noopNext = () => {
    void 0
  }

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
  executor: Func | undefined = defaultExecutor
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

export function executeByArity(prop: string, usable: any, ctx: any, next: any) {
  if (usable?.[prop]) {
    if (usable[prop].length >= 2) return usable[prop](ctx, next)
    const nxt = wrapNext(next),
      result = usable[prop](ctx, nxt)

    if (typeof result?.then === 'function') return result.then(nxt)

    return nxt()
  }
  return next()
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
