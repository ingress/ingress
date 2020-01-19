import { IncomingMessage, ServerResponse } from 'http'
import { Url } from 'url'
import { Middleware } from 'app-builder'
import { EventEmitter } from 'events'
import { Ingress } from './ingress'

export { Middleware } from 'app-builder'

const empty = (): object => Object.create(null)

export interface Request<T> extends IncomingMessage {
  context: T
}

interface Handler {
  invokeAsync: Middleware<any>
}

export type Body = any
export type BaseAuthContext =
  | { authenticated: boolean }
  | { authenticated: false; headers?: { [key: string]: string }; responseCode?: number }
export interface Response<T> extends ServerResponse {
  context: T
}

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
    body: Body
    response: Body
    controllerInstance: any
    parserResult: any
    handler: Handler
  }

  get body() {
    return this.route.response
  }

  set body(value: Body) {
    this.route.response = value
  }

  constructor(req: IncomingMessage, res: ServerResponse) {
    super()
    this.req = Object.assign(req, { context: this }) as any
    this.res = Object.assign(res, { context: this }) as any
    this.route = Object.assign(empty(), {
      query: empty(),
      params: empty()
    }) as any
    this.error = this.body = null
  }
}

export class DefaultContext extends BaseContext<DefaultContext, any> {}
