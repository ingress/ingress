import { BaseContext } from '../context'
import { compose, Middleware } from 'app-builder'
import { createAnnotationFactory } from 'reflect-annotations'
import { Func } from '../lang'

export type AfterRequestHandler = Middleware<BaseContext<any, any>>

export class AfterRequestAnnotation {
  private afterReqList: AfterRequestHandler[] = []
  constructor(...afterReq: AfterRequestHandler[]) {
    this.afterReqList = afterReq
  }
  get middleware(): Middleware<BaseContext<any, any>> {
    const fn = compose(this.afterReqList)
    return (context: BaseContext<any, any>, next: Func<Promise<any>>): Promise<any> => {
      context.once('response-finished', async ({ context, error }) => {
        try {
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
