import { AppBuilder } from 'app-builder'
import createEnvironment, { Environment } from './Environment'
import { HttpServer} from './HttpServer'
import { defaultHandler } from './default'

export class Server extends AppBuilder {

  constructor (webserver = new HttpServer, contextFactory = x => new Environment(x)) {
    super()
    this.createContext = contextFactory
    this.webserver = webserver
  }

  listen (...args) {
    const appFn = this.build()
    this.webserver.onRequest((req, res) => {
      appFn(this.createContext({req, res}))
    })
    return this.webserver.listen(...args)
  }

  useDefault() {
    return this.use(defaultHandler)
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
