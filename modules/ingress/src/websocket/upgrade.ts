import { Ingress } from '../ingress'
import ws, { Server } from 'ws'
import { Router } from '../router/router'
import { Func, once } from '../lang'
import { WebsocketServerResponse } from './response'
import { StatusCode } from '@ingress/http-status'
import { Container } from '@ingress/di'
import { Socket } from 'net'
import { DefaultContext, Middleware, Request } from '../context'
import { compose } from 'app-builder'

export type UpgradeBody<T = DefaultContext> = {
  head: Buffer
  req: Request<T>
  socket: Socket
  reject: (code?: number) => void
  accept: () => Promise<Websocket>
}

export type Websocket = ws

export class Websockets {
  private server = new Server({ noServer: true, clientTracking: false })
  private onUpgrade: Func | null = null
  constructor(
    private preUpgrade: Middleware<any>,
    private router: Router<any>,
    private container: Container<any>
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
