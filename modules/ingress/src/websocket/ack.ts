export class TimeoutError extends Error {
  public name = 'TimeoutError'
  constructor(public ackId: string, ...args: any[]) {
    super(...args)
    Error.captureStackTrace(this, TimeoutError)
  }
}

/**
 * An ACK is a timed deferred that will cleanup when its done
 */
export class Ack<T = any> {
  resolve!: (value?: T | PromiseLike<T>) => void
  reject!: (reason?: any) => void
  promise: Promise<T | undefined | PromiseLike<T>>
  constructor(pending: Map<string, Ack>, public id: string, public timeout: number) {
    this.promise = new Promise<T | undefined | PromiseLike<T>>((resolve, reject) => {
      const timer = setTimeout(() => this.reject(new TimeoutError(id)), timeout)
      this.resolve = (x) => {
        pending.delete(id)
        clearTimeout(timer)
        resolve(x)
      }
      this.reject = (reason: any) => {
        clearTimeout(timer)
        pending.delete(id)
        reject(reason)
      }
    })
  }
}
