export function noop() {
  void 0
}

export function once(fn: any, after: any = noop) {
  const one = function (this: any, ...args: any[]) {
    const res = fn.call(this, ...args)
    fn = after
    return res
  }
  return one
}
