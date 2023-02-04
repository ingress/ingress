import { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http'
import { NodeHttpContext } from './context.node.js'
import { isThenable } from './util.js'
import { Injectable, AppState, Ingress } from '@ingress/core'
import type { ListenOptions } from 'node:net'
import type { Duplex } from 'node:stream'
import type { HttpContext } from '@ingress/types'
import type { NextFn } from '@ingress/core'

type HttpOptions = {
  listen: ListenOptions | number | string
  clientErrorHandler: (err: Error, socket: Duplex) => any
}

@Injectable()
export class Http {
  options: HttpOptions
  constructor(options?: Partial<HttpOptions>) {
    options = options ? { ...options } : {}
    if (!options?.listen) {
      options.listen = Number(process.env.PORT) || 0
    }
    if (!options?.clientErrorHandler) {
      options.clientErrorHandler = defaultClientError
    }
    this.options = options as HttpOptions
  }
  public server: HttpServer = null as any
  private handler: (req: IncomingMessage, res: ServerResponse) => void = null as any
  initializeContext(ctx: HttpContext<any>) {
    return ctx
  }
  async start(app: Ingress<HttpContext<any>>, next: NextFn) {
    this.options.clientErrorHandler = this.options.clientErrorHandler?.bind(app)
    let root = app.container.findProvidedSingleton(Http)
    if (!root) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      root = this
      app.container.registerSingleton({ provide: Http, useValue: this })
      this.server = new HttpServer()
    }
    await next()

    if (root !== this) {
      this.server = root.server
      app.unUse(this)
    } else {
      const ingress = (req: IncomingMessage, res: ServerResponse) => {
        app.middleware(new NodeHttpContext(req, res, app))
      }
      this.handler = ingress
      this.server.addListener('request', ingress)
      const starter = () =>
        new Promise<void>((resolve, reject) => {
          this.server.once('error', reject)
          this.server.on('clientError', this.options.clientErrorHandler!)
          this.server.listen(this.options.listen, () => {
            this.server.removeListener('error', reject)
            resolve()
          })
        })
      app.registerDriver(this.handler, starter)
    }
    return { http: this as Http }
  }
  public flown = () => this.inflight--
  public inflight = 0
  middleware(context: HttpContext<any>, next: NextFn) {
    this.inflight++
    let result: any = null,
      error: any = null
    try {
      result = next()
    } catch (err) {
      error = err
    }
    if (error !== null) return context.response.send(error)

    if (isThenable(result)) return result.then(context.response.send, context.response.send)

    return context.response.send(result)
  }

  stop(app: Ingress<HttpContext<any>>, next: NextFn) {
    if (this.handler) {
      this.server.removeListener('request', this.handler)
      if (app.readyState & AppState.Running && app.readyState & AppState.Stopping) {
        return new Promise<void>((resolve, reject) => {
          this.server.close((e) => (e ? reject(e) : resolve()))
        }).then(next)
      }
    } else {
      return next()
    }
  }
}

const clientErrorText = 'HTTP/1.1 400 Bad Request\r\n\r\n'

function defaultClientError(this: any, err: Error & { code?: string }, socket: Duplex) {
  if (socket.writable) {
    socket.end(clientErrorText)
  }
}

export { HttpContext }

const app = new Ingress(),
  u = app.use(new Http())

void u
