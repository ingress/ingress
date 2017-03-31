import { CoreContext } from './context'
import { Middleware as GenericMiddleware } from 'app-builder'

export interface Middleware<T extends CoreContext<T>> {
  (context: T, next: GenericMiddleware<T>): any
}

export {
  GenericMiddleware
}

export interface MiddlewareOptions<T extends CoreContext<T>> {
  middleware?: Middleware<T>
}
