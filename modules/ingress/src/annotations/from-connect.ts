import { createAnnotationFactory } from 'reflect-annotations'
import { Middleware } from 'app-builder'
import { DefaultContext } from '../context'

export function fromConnect(fn: any) {
  return createAnnotationFactory(
    class {
      get middleware(): Middleware<any> {
        return (context: DefaultContext, next: any) =>
          new Promise((resolve, reject) => {
            fn(context.req, context.res, (error?: Error) => {
              if (error) {
                reject(error)
              } else {
                resolve(next())
              }
            })
          })
      }
    }
  )()
}
