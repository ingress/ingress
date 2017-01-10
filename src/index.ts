import { AppBuilder, Middleware } from 'app-builder'
import createContext, { DefaultContext } from './context'
import { DefaultMiddleware } from './default'
import { Server as HttpServer,
  createServer,
  IncomingMessage,
  ServerResponse
} from 'http'

export interface Addon<T extends DefaultContext<T>> {
  middleware?: Middleware<T>
  register?(server: Server<T>): any
}

export interface MiddlewareAddon<T extends DefaultContext<T>> extends Middleware<T> {
  register?(server: Server<T>): any
}

export type Usable<T extends DefaultContext<T>> = MiddlewareAddon<T> | Addon<T>

export interface ServerOptions<T> {
  server?: HttpServer,
  contextFactory?: <T>({ req, res }: { req: IncomingMessage, res: ServerResponse}) => T
}

export default function ingress<T extends DefaultContext<T>> (options?: ServerOptions<T>) {
  return new Server<T>(options)
}

export class Server<T extends DefaultContext<T>> {
  private _appBuilder: AppBuilder<T>
  private _starting: Array<Promise<any>>
  private _createContext: <T>({ req, res }: { req: IncomingMessage, res: ServerResponse}) => T
  public webserver: HttpServer

  constructor ({ server = createServer(), contextFactory = createContext }: ServerOptions<T> = {}) {
    this._appBuilder = new AppBuilder<T>()
    this._createContext = contextFactory
    this._starting = []
    this.webserver = server
  }

  use (addon: Usable<T>) {
    if ('middleware' in addon) {
      this.use((addon as Addon<T>).middleware)
    }

    if ('register' in addon) {
      this._starting.push((addon as Addon<T>).register(this))
    }

    if ('function' === typeof addon) {
      this._appBuilder.use(addon)
    }

    return this
  }

  build () {
    const requestHandler = this._appBuilder.build()

    return (req: IncomingMessage, res: ServerResponse) => requestHandler(this._createContext<T>({ req, res }))
  }

  listen (...args: Array<any>) {
    this.webserver.on('request', this.build())
    return Promise.all(this._starting).then(() => {
      this._starting.length = 0
      return new Promise(res => (<any>this.webserver).listen(...[...args, res]))
    })
  }

  close () {
    return new Promise(res => this.webserver.close(res))
  }
}

export {
  createContext,
  DefaultMiddleware,
  Server as Ingress
}

export * from './context'
