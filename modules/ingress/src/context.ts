import { IncomingMessage, ServerResponse } from 'http'
import { Url } from 'url'
import { Middleware } from 'app-builder'
import { EventEmitter } from 'events'
import { Ingress } from './ingress'
import { identity } from './lang'
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
  public app!: Ingress<T, A>
  public req: Request<T>
  public res: Response<T>
  public error: Error | null | undefined
  public route: {
    url: Url
    query: { [key: string]: any }
    params: { [key: string]: any }
    body: any
    response: any
    controllerInstance: any
    parserResult: any
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
