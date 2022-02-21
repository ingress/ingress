export interface Middleware<T, R = any> {
  (context: T, next: ContinuationMiddleware<T>): R | Promise<R>
}
export interface ContinuationMiddleware<T, R = any> {
  (context?: T, next?: Middleware<T>): R | Promise<R>
}
export type Func<T = any> = (...args: any[]) => T

const flatten = <T>(values: Array<T | Array<T>>) => ([] as any).concat(...values) as T[],
  noop = function noop() {
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
 * Create a function to invoke all passed middleware functions
 * with a single argument <T>context
 * @param middleware
 */
export function compose<T = any>(
  ...middleware: (Middleware<T> | Middleware<T>[])[]
): ContinuationMiddleware<T> {
  const mw = flatten(middleware).filter((x) => {
    if ('function' !== typeof x) {
      throw new TypeError(`${x}, must be a middleware function accepting (context, next) arguments`)
    }
    return x as any
  })
  return (ctx, next) => {
    return exec(mw, ctx as T, next)
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
export function exec<T>(mw: Middleware<T>[], ctx: T, next?: Middleware<T>): Promise<void> | void {
  let i = -1
  const nxt = () => {
    if (++i < mw.length) {
      return mw[i](ctx!, nxt)
    } else if (next) {
      return next(ctx, noop)
    }
  }
  return nxt()
}
