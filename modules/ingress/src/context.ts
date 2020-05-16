import { IncomingMessage, ServerResponse } from 'http'
import { Url } from 'url'
import { Middleware } from 'app-builder'
import { EventEmitter } from 'events'
import { Ingress } from './ingress'

export { Middleware } from 'app-builder'

const empty = (): object => Object.create(null)

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
 * @internal
 */
export class BaseContext<T extends BaseContext<T, A>, A extends BaseAuthContext> extends EventEmitter {
  handleError!: (error: Error | null) => any
  handleResponse!: () => any

  public authContext!: A
  public scope!: {
    get: <T>(symbol: T, valueInstead?: any) => T
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

  get body() {
    return this.route.response
  }

  set body(value: any) {
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
