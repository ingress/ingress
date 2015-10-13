import { AppBuilder } from 'app-builder'
import createEnvironment, { Environment } from './Environment'
import { HttpServer} from './HttpServer'
import { defaultHandler, defaultError } from './default'

export default function () {
  return new Server
}

export class Server extends AppBuilder {

  constructor (webserver = new HttpServer, contextFactory = x => new Environment(x)) {
    super()
    this.createContext = contextFactory
    this.webserver = webserver
  }

  listen (...args) {
    const appFn = this.build(),
      errorHandler = this.onError

    this.webserver.onRequest((req, res) => {
      const context = this.createContext({req, res}),
        contextPromise = appFn(context)
      if (errorHandler) {
        contextPromise.then(defaultHandler, error => {
          errorHandler(context, error)
          defaultError(context)
        })
      }
    })
    return this.webserver.listen(...args)
  }

  useDefault (onError = () => {}) {
    this.onError = onError
    return this
  }

  close () {
    return this.webserver.close()
  }
}

export {
  Environment,
  HttpServer
}
