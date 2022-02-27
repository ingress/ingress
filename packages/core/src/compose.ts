import type { Func } from './di'

export interface Middleware<T, R = any> {
  (context: T, next: ContinuationMiddleware<T>): R | Promise<R>
}
export interface ContinuationMiddleware<T, R = any> {
  (context?: T, next?: Middleware<T>): R | Promise<R>
}

const noop = function noop() {
  void 0
}

/**
 * Determines if a function looks like a middleware function
 * @param value
 * @returns
 */
export function isMiddlewareFunction(value: any): value is Func {
  return typeof value === 'function' && value.toString().indexOf('class') !== 0
}

/**
 * Take a snapshot of middleware and return a function to invoke all with a single argument <T>context
 * @param middleware
 */
export function compose<T = any>(...middleware: Middleware<T>[]): ContinuationMiddleware<T> {
  for (const x of middleware) {
    if (!isMiddlewareFunction(x)) {
      throw new TypeError(`${x}, must be a middleware function accepting (context, next) arguments`)
    }
  }
  return (ctx, next) => {
    return exec(middleware, ctx as T, next, defaultExecutor)
  }
}

const defaultExecutor = (func: Func, ctx: any, next: any) => func(ctx, next)

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
  next: Middleware<T> | undefined = undefined,
  executor: Func | undefined = defaultExecutor
): Promise<void> | void {
  let i = -1
  const nxt = (): void | Promise<void> => {
    if (++i < mw.length) {
      return executor(mw[i], ctx, nxt)
    } else if (next) {
      return next(ctx, noop)
    }
  }
  return nxt()
}
