import type { BaseContext } from '../context.js'
import { compose, Middleware } from 'app-builder'
import { createAnnotationFactory } from 'reflect-annotations'
import type { Func } from '../lang.js'

export type AfterRequestHandler = Middleware<BaseContext<any, any>>

export class AfterRequestAnnotation {
  private afterReqList: AfterRequestHandler[] = []
  constructor(...afterReq: AfterRequestHandler[]) {
    this.afterReqList = afterReq
  }
  get middleware(): Middleware<BaseContext<any, any>> {
    const fn = compose(this.afterReqList)
    return (context: BaseContext<any, any>, next: Func<Promise<any>>): Promise<any> => {
      context.pendingAfterReqHandlers += 1
      context.once('response-finished', async ({ context, error }) => {
        try {
          await fn(context)
        } catch (e) {
          context.emit('error', { error, context })
        } finally {
          context.pendingAfterReqHandlers -= 1
          if (!context.pendingAfterReqHandlers) {
            context.emit('after-request-finished', { context })
          }
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
