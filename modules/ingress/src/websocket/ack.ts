export class TimeoutError extends Error {
  public name = 'TimeoutError'
  constructor(...args: any[]) {
    super(...args)
    //Error.captureStackTrace(this, TimeoutError)
  }
}

/**
 * An ACK is a deferred 😲
 */
export class Ack<T = any> {
  resolve!: (value?: T | PromiseLike<T>) => void
  reject!: (reason?: any) => void
  promise: Promise<T>
  constructor(timeout: number) {
    const timer = setTimeout(() => this.reject(new TimeoutError()), timeout)
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (x) => {
        clearTimeout(timer)
        resolve(x)
      }
      this.reject = reject
    })
  }
}
