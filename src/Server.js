import { AppBuilder } from 'app-builder'
import createEnvironment, { Environment } from './Environment'
import { HttpServer} from './HttpServer'
import { defaultHandler, defaultError } from './default'

export class Server extends AppBuilder {

  constructor (webserver = new HttpServer, contextFactory = x => new Environment(x)) {
    super()
    this.createContext = contextFactory
    this.webserver = webserver
  }

  listen (...args) {
    const appFn = this.build(),
      useDefaultHandler = this.defaultEnabled
    this.webserver.onRequest((req, res) => {
      const context = this.createContext({req, res}),
        contextPromise = appFn(context)
      if (useDefaultHandler) {
        contextPromise.then(defaultHandler, error => defaultError(context, error))
      }
    })
    return this.webserver.listen(...args)
  }

  useDefault () {
    this.defaultEnabled = true
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

export default function () {
  return new Server
}
