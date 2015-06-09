import { AppBuilder } from 'app-builder'
import createEnvironment, { Environment } from './Environment'
import { HttpServer} from './HttpServer.js'

export class Server extends AppBuilder {

  constructor (webserver = new HttpServer, environmentFactory = x => new Environment(x)) {
    super()
    this.createEnvironment = environmentFactory
    this.webserver = webserver
  }

  listen (...args) {
    const appFn = this.build()
    this.webserver.onRequest((req, res) => {
      appFn.call(this, this.createEnvironment({req, res}))
    })
    return this.webserver.listen(...args)
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
