import { AppBuilder } from 'app-builder'
import { Environment } from './Environment'
import { HttpServer} from './HttpServer.js'

export class Server extends AppBuilder {

  constructor (webserver) {
    super()
    this.webserver = webserver;
  }

  listen (...args) {
    const appFn = this.build()
    this.webserver.onRequest((request, response) => {
      appFn.call(this, new Environment({request,response}))
    })
    return this.webserver.listen(...args)
  }

  close () {
    return this.webserver.close();
  }
}

export {
  Environment,
  HttpServer
}

export default function () {
  return new Server(new HttpServer)
}