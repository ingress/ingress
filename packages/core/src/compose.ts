export interface Middleware<T, R = any> {
  (context: T, next: ContinuationMiddleware<T>): R | Promise<R>
}
export interface ContinuationMiddleware<T, R = any> {
  (context?: T, next?: Middleware<T>): R | Promise<R>
}
export type Func<T = any> = (...args: any[]) => T

const flatten = <T>(values: Array<T | Array<T>>) => ([] as any).concat(...values) as T[],
  noop = function noop() {
    return Promise.resolve()
  }

/**
 * Determines if a function looks like a middleware function
 * @param value
 * @returns
 */
export function isMiddlewareFunction(value: any): value is Func {
  return typeof value === 'function' && value.toString().indexOf('class') !== 0
}

class Executor<T = any> {
  constructor(private mw: Middleware<T>, private continuation: ContinuationMiddleware<T>) {}
  tryInvokeMiddleware<T>(
    context: T,
    middleware: Middleware<T>,
    next: ContinuationMiddleware<T> = noop
  ) {
    try {
      const resolved = middleware ? middleware(context, next) : context
      return Promise.resolve(resolved)
    } catch (error) {
      return Promise.reject(error)
    }
  }
  get middleware() {
    return (context: T, next: ContinuationMiddleware<T>) => {
      return this.tryInvokeMiddleware(context, this.mw, this.continuation.bind(null, context, next))
    }
  }
}

/**
 * Create a function to invoke all passed middleware functions
 * with a single argument <T>context
 * @param middleware
 */
export function compose<T = any>(
  ...middleware: (Middleware<T> | Middleware<T>[])[]
): ContinuationMiddleware<T> {
  return flatten(middleware)
    .filter((x) => {
      if ('function' !== typeof x) {
        throw new TypeError(
          `${x}, must be a middleware function accepting (context, next) arguments`
        )
      }
      return x as any
    })
    .reduceRight((composed: ContinuationMiddleware<T>, mw: Middleware<T>) => {
      return new Executor<T>(mw, composed).middleware as ContinuationMiddleware<T>
    }, Executor.prototype.tryInvokeMiddleware as ContinuationMiddleware<T>)
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
  ctx: T,
  mw: Middleware<T>[],
  continuation?: ContinuationMiddleware<T>
): Promise<void> {
  let i = -1
  const next = () => {
    if (++i < mw.length) {
      return mw[i](ctx, next)
    } else if (continuation) {
      return continuation(ctx, noop)
    }
    return Promise.resolve()
  }
  return next()
}
