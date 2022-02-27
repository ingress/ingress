import { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http'
//import { StatusCode } from '@ingress/types'
import { NodeHttpContext } from './context.node.js'
import { isThenable } from './util.js'
import type { Ingress, Func, Usable } from '@ingress/core'
import { Injectable } from '@ingress/core'
import type { ListenOptions } from 'node:net'
import type { Duplex } from 'node:stream'
import type { HttpContext } from '@ingress/types'

type HttpOptions = {
  listen: ListenOptions | number | string
  clientErrorHandler: (err: Error, socket: Duplex) => any
}

@Injectable()
export class Http implements Usable {
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
  public server!: HttpServer
  private handler!: (req: IncomingMessage, res: ServerResponse) => void
  async start(app: Ingress<any>, next: Func): Promise<void> {
    this.options.clientErrorHandler = this.options.clientErrorHandler?.bind(app)
    let root = app.container.findRegisteredSingleton(Http)
    if (!root) {
      root = this
      app.container.registerSingleton({ provide: Http, useValue: this })
      this.server = new HttpServer()
    }
    await next()

    if (root !== this) {
      this.server = root.server
      app.unUse(this)
    } else {
      this.server.addListener(
        'request',
        (this.handler = (req, res) => {
          app.middleware(new NodeHttpContext(req, res, app))
        })
      )
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
  }
  public flown = () => this.inflight--
  public inflight = 0
  middleware(context: NodeHttpContext<any>, next: Func<Promise<void>>): PromiseLike<void> | void {
    this.inflight++
    let result: any = null,
      error: any = null
    try {
      result = next()
    } catch (err) {
      error = err
    }
    if (error !== null) return context.send(error)

    if (isThenable(result)) return result.then(context.send, context.send)

    return context.send(result)
  }

  stop(app: Ingress<any>, next: Func<Promise<void>>): Promise<void> {
    if (this.handler) {
      this.server.removeListener('request', this.handler!)
      return new Promise<void>((resolve, reject) => {
        this.server.close((e) => (e ? reject(e) : resolve()))
      }).then(next)
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
