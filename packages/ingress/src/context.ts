import type { IncomingMessage, ServerResponse } from 'http'
import type { Url } from 'url'
import type { Middleware } from 'app-builder'
import { EventEmitter } from 'events'
import type { Ingress } from './ingress.js'
import { identity } from './lang.js'
import { Type } from '@ingress/di'

export { Middleware } from 'app-builder'

export { Type }

const empty = (): Record<string, any> => Object.create(null)

/**
 * @public
 */
export interface Request<T> extends IncomingMessage {
  context: T
}

/**
 * @public
 */
export interface BaseAuthContext {
  authenticated: boolean
}
/**
 * @public
 */
export interface Response<T> extends ServerResponse {
  context: T
}

/**
 * @public
 */
export type Body = any

/**
 * @internal
 */
export class BaseContext<
  T extends BaseContext<T, A>,
  A extends BaseAuthContext
> extends EventEmitter {
  static extractValue = identity
  static convert = identity
  handleError!: (error: Error | null) => any
  handleResponse!: () => any
  public id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  public authContext!: A
  public scope!: {
    get: <T>(symbol: Type<T>, valueInstead?: any) => InstanceType<Type<T>>
  }
  /**
   * Owning App instance
   */
  public app!: Ingress<T, A>

  public req: Request<T>
  public res: Response<T>
  public pendingAfterReqHandlers = 0

  /**
   * Any uncaught error occurring in the context is set here
   */
  public error: Error | null | undefined
  /**
   * Holds data relating to the currently executing route.
   */
  public route: {
    url: Url
    search: URLSearchParams
    /**
     * Parsed Query parameters
     * @deprecated
     */
    query: Record<string, any>
    /**
     * Parsed Route parameters
     */
    params: Record<string, any>
    /**
     * Parsed Body
     */
    body: any
    /**
     * The route's response body
     */
    response: any
    /**
     * The Controller as instantiated by the DI Container
     */
    controllerInstance: any
    /**
     * Raw Body Parser Result
     * Useful when a custom body parser is used
     */
    parserResult: any
    /**
     * The Route Handler
     */
    handler: { invokeAsync: Middleware<any> }
  }

  get body(): Body {
    return this.route.response
  }

  set body(value: Body) {
    this.route.response = value
  }

  constructor(req: IncomingMessage, res: ServerResponse) {
    super()
    this.req = Object.assign(req, { context: this }) as any
    this.res = Object.assign(res, { context: this }) as any
    this.route = empty() as any
    this.error = this.body = null
  }
}

/**
 * @public
 */
export class DefaultContext extends BaseContext<DefaultContext, any> {}
