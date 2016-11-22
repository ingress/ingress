import { AppBuilder, Middleware } from 'app-builder'
import createContext, { DefaultContext, Context, RequestContext} from './context'
import { Server as HttpServer,
  createServer,
  IncomingMessage,
  ServerResponse
} from 'http'
import { DefaultMiddleware } from './default'

export {
  DefaultContext,
  Context,
  DefaultMiddleware
}

declare global {
  interface Promise<T> extends PromiseLike<T> {}
}

export default function(server?: HttpServer) {
  return new Server<DefaultContext>(server, createContext)
}

export interface Addon<T> extends Middleware<T> {
  register?<T extends DefaultContext>(server: Server<T>): any
}

export class Server<T extends DefaultContext> {
  private _appBuilder: AppBuilder<T>
  private _startupPromises: Array<Promise<any>>
  private _createContext: <T>(requestContext: RequestContext) => T
  public webserver: HttpServer
  constructor (server = createServer(), contextFactory = createContext) {
    this._appBuilder = new AppBuilder<T>()
    this._createContext = contextFactory
    this.webserver = server
    this._startupPromises = []
  }

  /**
   * @deprecated
   */
  useDefault (onError?: (ctx: T) => any) {
    return this.use(new DefaultMiddleware({ onError }).middleware)
  }

  use (middlewareOrAddon: Addon<T>) {
    if ('function' === typeof middlewareOrAddon.register) {
      this._startupPromises.push(middlewareOrAddon.register(this))
    }

    if ('function' === typeof middlewareOrAddon) {
      this._appBuilder.use(middlewareOrAddon)
    }

    return this
  }

  build () {
    const requestHandler = this._appBuilder.build()

    return (req: IncomingMessage, res: ServerResponse) => requestHandler(this._createContext<T>({ req, res }))
  }

  listen (...args: Array<any>) {
    this.webserver.on('request', this.build())
    return Promise.all(this._startupPromises).then(() => {
      this._startupPromises.length = 0
      return new Promise(res => (<any>this.webserver).listen(...[...args, res]))
    })
  }

  close () {
    return new Promise(res => this.webserver.close(res))
  }
}
