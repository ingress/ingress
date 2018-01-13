import { AppBuilder } from 'app-builder'
import createContext, { CoreContext } from './context'
import { DefaultMiddleware } from './default'
import { Middleware, MiddlewareOptions } from './middleware'
import { Server as HttpServer, createServer, IncomingMessage, ServerResponse } from 'http'
import { PromiseConfig } from './promise'

export interface Addon<T extends CoreContext<T>> extends MiddlewareOptions<T> {
  register?(server: Server<T>): Promise<any> | undefined
}

export interface MiddlewareAddon<T extends CoreContext<T>> extends Middleware<T>, Addon<T> {}

export type Usable<T extends CoreContext<T>> = Addon<T> | MiddlewareAddon<T>

export interface ServerOptions<T> {
  server?: HttpServer
  contextFactory?: ({ req, res }: { req: IncomingMessage; res: ServerResponse }) => T
}

export default function ingress<T extends CoreContext<T>>(options?: ServerOptions<T>) {
  return new Server<T>(options)
}

export class Server<T extends CoreContext<T>> {
  private _appBuilder: AppBuilder<T>
  private _starting: Array<undefined | Promise<any>>
  private _createContext: ({ req, res }: { req: IncomingMessage; res: ServerResponse }) => T
  public webserver: HttpServer

  constructor({ server = createServer(), contextFactory = createContext }: ServerOptions<T> = {}) {
    this._appBuilder = new AppBuilder<T>()
    this._createContext = contextFactory as any
    this._starting = []
    this.webserver = server
  }

  use(middleware: Usable<T>) {
    const mw = middleware.middleware
    if (mw) {
      this.use(mw)
    }

    if (middleware.register) {
      this._starting.push(middleware.register(this))
    }

    if ('function' === typeof middleware) {
      this._appBuilder.use(middleware)
    }

    return this
  }

  build() {
    const requestHandler = this._appBuilder.build()

    return (req: IncomingMessage, res: ServerResponse) =>
      requestHandler(this._createContext({ req, res }))
  }

  listen(...args: Array<any>) {
    this.webserver.on('request', this.build())
    return PromiseConfig.constructor.all(this._starting).then(() => {
      this._starting.length = 0
      return new PromiseConfig.constructor(res => (<any>this.webserver).listen(...[...args, res]))
    })
  }

  close() {
    return new PromiseConfig.constructor(res => this.webserver.close(res))
  }
}

export { createContext, DefaultMiddleware }

export { StatusCode } from './status-code'
export * from './context'
export { PromiseConfig } from './promise'
