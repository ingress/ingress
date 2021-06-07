export const noop = (): void => void 0
export const identity = <T = any>(x: T): T => x
export type Func<T = any> = (...args: any[]) => T

/**
 * Execute {fn} one time and [after=noop] for every subsequent invocation
 */
export function once<T extends Func>(fn: T, after: Func = noop): T {
  const one = function (this: any, ...args: any[]) {
    const res = fn.call(this, ...args)
    fn = after as any
    return res
  }
  return one as T
}
