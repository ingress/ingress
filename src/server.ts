import { AppBuilder, Middleware } from 'app-builder'
import createContext, { Context, DefaultContext, RequestContext} from './context'
import { Server as HttpServer,
  createServer,
  IncomingMessage,
  ServerResponse
} from 'http'
import createDefaultHandler  from './default'

export default function(server?: HttpServer) {
  return new Server<Context>(server, createContext)
}

export interface Addon<T> extends Middleware<T> {
  register?<T extends Context>(server: Server<T>): any
}

export class Server<T extends Context> {
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
  useDefault (onError = () => Promise.resolve()) {
    return this.use(createDefaultHandler(onError))
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

export {
  Context,
  DefaultContext
}
