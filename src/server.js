import { AppBuilder } from 'app-builder'
import createEnvironment, { Context } from './context'
import { HttpServer} from './http-server'
import { defaultHandler, defaultError } from './default'

export default function () {
  return new Server
}

export class Server {

  constructor (webserver = new HttpServer, contextFactory = x => new Context(x)) {
    this.builder = new AppBuilder
    this.createContext = contextFactory
    this.webserver = webserver
  }

  use (mw) {
    this.builder.use(mw)
    return this
  }

  useDefault (onError = () => {}) {
    this.onError = onError
    return this
  }

  build () {
    const appFn = this.builder.build(),
      errorHandler = this.onError
    return (req, res) => {
      const context = this.createContext({req, res}),
        waiter = appFn(context)
      if (errorHandler) {
        waiter.then(() => defaultHandler(context), error => {
          errorHandler(context, error)
          defaultError(context)
        })
      }
    }
  }

  listen (...args) {
    this.webserver.onRequest(this.build())
    return this.webserver.listen(...args)
  }

  close () {
    return this.webserver.close()
  }
}

export {
  Context,
  HttpServer
}
