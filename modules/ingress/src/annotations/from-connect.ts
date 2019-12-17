import { IncomingMessage, ServerResponse } from 'http'
import { createAnnotationFactory } from 'reflect-annotations'
import { Middleware, Context } from '../ingress'

export function fromConnect(fn: (req: IncomingMessage, res: ServerResponse, next: any) => void) {
  return createAnnotationFactory(
    class {
      get middleware(): Middleware<any> {
        return (context: Context, ingressNext: any) => {
          const deferred: any = {}
          deferred.promise = new Promise((resolve, reject) => {
            deferred.reject = reject
            deferred.resolve = resolve
          })
          const next = (error?: Error) => {
            if (error) {
              deferred.reject(error)
            }
            deferred.resolve(ingressNext())
          }
          fn(context.req, context.res, next)
          return deferred.promise
        }
      }
    }
  )()
}
