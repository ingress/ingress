import { AppBuilder } from 'app-builder'
import createContext, { Context } from './context'
import { HttpServer} from './http-server'
import createDefaultHandler  from './default'

export default function (...args) {
  return new Server(...args)
}

export class Server extends AppBuilder {

  constructor (server = new HttpServer, contextFactory = createContext) {
    super()
    this.createContext = contextFactory
    this.webserver = server
  }

  useDefault (onError = () => {}) {
    return this.use(createDefaultHandler(onError))
  }

  build () {
    const requestHandler = super.build()

    return (req, res) => requestHandler(this.createContext({ req, res }))
  }

  listen (...args) {
    this.webserver.on('request', this.build())
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
