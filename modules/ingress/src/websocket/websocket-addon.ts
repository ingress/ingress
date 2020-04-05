import { Ingress } from '../ingress'
import { BaseContext } from '../context'
import { IncomingMessage, Server as HttpServer } from 'http'
import { Websockets, IServerConfig, WebsocketServer, WebsocketRequest } from './websockets'

type WebsocketServerConfig = Omit<IServerConfig, 'httpServer'> & {
  contextFactory?: (req: IncomingMessage) => Promise<BaseContext<any, any>> | BaseContext<any, any>
}

export class WebsocketAddon {
  server = new WebsocketServer()
  private handler?: (req: WebsocketRequest) => void

  constructor(private options: WebsocketServerConfig = {}) {}

  start(app: Ingress) {
    this.server.mount({
      ...this.options,
      httpServer: app.server || (app.server = new HttpServer()),
    })
    this.handler = async (req: WebsocketRequest) => {
      if (this.options.contextFactory) {
        const context = await this.options.contextFactory(req.httpRequest)
        if (!context.authContext.authenticated) {
          req.reject(403)
        } else {
          Object.assign(req.accept(void 0, req.origin), { context })
        }
      } else {
        req.accept(void 0, req.origin)
      }
    }
    this.server.on('request', this.handler)
    return (app.websockets = new Websockets(this.server))
  }

  async stop(app: Ingress) {
    if (!app.websockets) {
      return
    }
    delete app.websockets
    this.server.off('request', this.handler!)
    this.handler = undefined
    if (this.server.connections.length > 0) {
      let count = this.server.connections.length
      let handler: any
      await new Promise((resolve) => {
        handler = () => {
          if (--count === 0) {
            this.server.off('close', handler)
            resolve()
          }
        }
        this.server.on('close', handler)
        this.server.shutDown()
      })
      this.server.off('close', handler)
    } else {
      this.server.shutDown()
    }
  }
}
