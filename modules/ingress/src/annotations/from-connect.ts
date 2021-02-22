import { createAnnotationFactory, AnnotationFactory } from 'reflect-annotations'
import { DefaultContext } from '../context.js'
import { once } from '../lang.js'

export function fromConnect<T>(fn: (...args: any[]) => void): AnnotationFactory<T> {
  return createAnnotationFactory(
    class {
      middleware(context: DefaultContext, next: () => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
          const nxt = once((error?: Error) => (error ? reject(error) : resolve(next())))
          //this is contestable, should we fallthrough if the response is handled?
          context.once('response-finished', ({ error }) => {
            nxt(error)
          })
          fn(context.req, context.res, nxt)
        })
      }
    }
  )()
}
