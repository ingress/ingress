import { Middleware, BaseContext } from './context'
import { createAnnotationFactory } from 'reflect-annotations'

export type AfterRequestHandler = (context: BaseContext<any, any>) => any

export class AfterRequestAnnotation {
  constructor(private afterReq: AfterRequestHandler | { handler: AfterRequestHandler; runOnError: true }) {}
  get middleware(): Middleware<BaseContext<any, any>> {
    const after = this.afterReq
    return (context, next) => {
      context.once('response-finished', async ({ context, error }) => {
        if (error && !('runOnError' in after)) {
          return
        }
        try {
          const fn = 'handler' in after ? after.handler : after
          await fn(context)
        } catch (e) {
          context.emit('error', { error, context })
        }
      })
      return next()
    }
  }
}

/**
 * Since the request occurs outside of the request/response lifetime, ensure an error handler is added to context
 */
export const AfterRequest = createAnnotationFactory(AfterRequestAnnotation)
