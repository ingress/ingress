import { Ingress } from '../ingress'
import Websocket, { Server } from 'ws'
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

export class Websockets {
  private server = new Server({ noServer: true, clientTracking: false })
  private onUpgrade: Func | null = null
  constructor(
    private preUpgrade: Middleware<any>,
    private router: Router<any>,
    private container: Container<any>
  ) {}

  setupUpgradeHandler(app: Ingress): void {
    let handled = false
    const handler = compose(
      this.preUpgrade,
      (context, next) => {
        if (context.req.method === 'GET') {
          //Set the method to upgrade, to trigger the correct routing
          //This state is only visible to userland middleware if it is marked with 'BeforeBodyParser' priority
          context.req.method = 'UPGRADE'
        }
        return next()
      },
      this.router.middleware,
      (ctx, next) => {
        if (ctx.res.statusCode !== 200) {
          ctx.route.body.reject(ctx.res.statusCode)
        }
        if (!handled) {
          ctx.route.body.reject()
        }
        return next()
      }
    )
    this.onUpgrade = async (req, socket, head) => {
      const context = app.createContext(req, new WebsocketServerResponse(req)),
        reject = once((code = 404) => {
          handled = true
          socket.write(`HTTP/1.1 ${code} ${StatusCode[code]}\r\n\r\n`)
          socket.destroy()
        })
      context.route.body = {
        req,
        socket,
        head,
        reject,
        accept: once(() => {
          handled = true
          return new Promise((resolve) => this.server.handleUpgrade(req, socket, head, resolve))
        }),
      }
      context.scope = this.container.createChildWithContext(context)
      handler(context)
    }
    app.server?.addListener('upgrade', this.onUpgrade)
  }
  start(app: Ingress): Promise<any> {
    if (this.router.handlesUpgrade()) {
      this.setupUpgradeHandler(app)
    }
    return Promise.resolve()
  }
  stop(app: Ingress): Promise<any> {
    if (this.router.handlesUpgrade() && this.onUpgrade) {
      app.server?.removeListener('upgrade', this.onUpgrade)
    }
    return Promise.resolve()
  }
}
