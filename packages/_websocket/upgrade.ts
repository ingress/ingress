import type { Ingress } from '../ingress.js'
import WebSocket, * as ws from 'ws'
import type { Router } from '../router/router.js'
import { Func, once } from '../lang.js'
import { WebsocketServerResponse } from './response.js'
import { StatusCode } from '@ingress/http-status'
import type { Container } from '@ingress/di'
import type { Socket } from 'net'
import type { DefaultContext, Middleware, Request } from '../context.js'
import { compose } from 'app-builder'

const Server = ws.Server

export type UpgradeBody<T = DefaultContext> = {
  head: Buffer
  req: Request<T>
  socket: Socket
  reject: (code?: number) => void
  accept: () => Promise<Websocket>
}

export type Websocket = WebSocket

export class Websockets {
  private server = new Server({ noServer: true, clientTracking: false })
  private onUpgrade: Func | null = null
  constructor(
    private preUpgrade: Middleware<any>,
    private router: Router<any>,
    private container: Container
  ) {}

  setupUpgradeHandler(app: Ingress): void {
    const finish = compose(this.preUpgrade, this.router.middleware, (ctx, next) => {
      //reject by default if not handled by this point
      ctx.route.body.reject()
      return next()
    })
    this.onUpgrade = async (req, socket, head) => {
      const context = app.createContext(req, new WebsocketServerResponse(req)),
        handle = once((success: boolean, code = 404) => {
          if (success) {
            return new Promise((resolve) => this.server.handleUpgrade(req, socket, head, resolve))
          }
          socket.write(`HTTP/1.1 ${code} ${StatusCode[code]}\r\n\r\n`)
          socket.destroy()
        })
      context.route.body = {
        req,
        socket,
        head,
        reject: handle.bind(null, false),
        accept: handle.bind(null, true),
      }
      context.scope = this.container.createChildWithContext(context)
      finish(context)
    }
    app.server?.addListener('upgrade', this.onUpgrade)
  }
  start(app: Ingress): Promise<any> {
    if (this.router.handlesUpgrade) {
      this.setupUpgradeHandler(app)
    }
    return Promise.resolve()
  }
  stop(app: Ingress): Promise<any> {
    if (this.router.handlesUpgrade && this.onUpgrade) {
      app.server?.removeListener('upgrade', this.onUpgrade)
    }
    return Promise.resolve()
  }
}
