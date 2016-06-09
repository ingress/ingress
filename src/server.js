import { AppBuilder } from 'app-builder'
import createContext, { Context } from './context'
import { Server as HttpServer } from 'http'
import createDefaultHandler  from './default'

export default function (...args) {
  return new Server(...args)
}

export class Server extends AppBuilder {

  constructor (server = new HttpServer, contextFactory = createContext) {
    super()
    this.createContext = contextFactory
    this.webserver = server
    this.startup = []
  }

  useDefault (onError = () => {}) {
    return this.use(createDefaultHandler(onError))
  }

  use (middlewareOrAddon) {
    if ('function' === typeof middlewareOrAddon.register) {
      middlewareOrAddon.register(this)
    }

    if ('function' === typeof middlewareOrAddon) {
      super.use(middlewareOrAddon)
    }

    return this
  }


  build () {
    const requestHandler = super.build()

    return (req, res) => requestHandler(this.createContext({ req, res }))
  }

  listen (...args) {
    this.webserver.on('request', this.build())
    return Promise.all(this.startup).then(() => {
      this.startup.length = 0
      return new Promise(res => this.webserver.listen(...[...args, res]))
    })
  }

  close () {
    return new Promise(res => this.webserver.close(res))
  }
}

export {
  Context
}
