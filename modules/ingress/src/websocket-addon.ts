import { Ingress, Authenticator } from './ingress'
import { Websockets, IServerConfig, WebsocketServer, WebsocketRequest } from './websockets'

type WebsocketServerConfig = Omit<IServerConfig, 'httpServer'> & {
  authenticator?: Authenticator
}

export class WebsocketAddon {
  server = new WebsocketServer()
  private handler: (req: WebsocketRequest) => void

  constructor(private options: WebsocketServerConfig = {}) {}

  register(app: Ingress) {
    this.server.mount({
      ...this.options,
      httpServer: app.server
    })
    this.handler = async (req: WebsocketRequest) => {
      if (this.options.authenticator) {
        const authContext = await this.options.authenticator({ req: req.httpRequest })
        if (!authContext.authenticated) {
          req.reject(403)
        } else {
          Object.assign(req.accept(void 0, req.origin), { authContext })
        }
      } else {
        req.accept(void 0, req.origin)
      }
    }
    this.server.on('request', this.handler)
    return (app.websockets = new Websockets(this.server))
  }

  async unregister(app: Ingress) {
    delete app.websockets
    this.server.off('request', this.handler)
    if (this.server.connections.length > 0) {
      let count = this.server.connections.length
      let handler: any
      await new Promise(resolve => {
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
