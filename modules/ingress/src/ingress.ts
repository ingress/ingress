import { AppBuilder, Middleware, compose } from 'app-builder'
import { BaseContext, DefaultContext, BaseAuthContext } from './context'
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { WebsocketAddon } from './websocket-addon'
import { Router, Controller } from './router/router'
import { DefaultMiddleware } from './default-middleware'
import { Websockets } from './websockets'

interface SetupTeardown {
  (server: Ingress<any>): Promise<any> | any
}

interface Usable<T> {
  register?: SetupTeardown
  unregister?: SetupTeardown
  middleware?: Middleware<T>
}

export type Addon<T> = Usable<T> | (Usable<T> & Middleware<T>)
export type Authenticator = (options: { req: IncomingMessage }) => Promise<BaseAuthContext> | BaseAuthContext

export interface ListenOptions {
  port?: number
  host?: string
  path?: string
  backlog?: number
  exclusive?: boolean
  readableAll?: boolean
  writableAll?: boolean
}

export default function ingress<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
>(
  { authenticator, routes }: { authenticator?: Authenticator; routes?: Controller<any> | Controller<any>[] } = {
    routes: []
  }
) {
  const controllers = Array.isArray(routes) ? routes : (routes && [routes]) || [],
    server = new Ingress<T, A>().use(new DefaultMiddleware<T, A>()),
    authContextFactory = authenticator || (() => ({ authenticated: true }))

  server.use(async (context, next) => {
    context.authContext = (await authContextFactory(context)) as A
    return next()
  })

  server.use(new Router<T>({ controllers })).use(
    new WebsocketAddon({
      authenticator: authContextFactory
    })
  )
  return server
}

export { ingress }

export class Ingress<T extends BaseContext<T, A> = DefaultContext, A extends BaseAuthContext = BaseAuthContext> {
  private appBuilder = new AppBuilder<T>()
  private closing = false
  private starting = false
  private setups: SetupTeardown[] = []
  private teardowns: SetupTeardown[] = []

  public server: HttpServer
  public websockets?: Websockets

  constructor({ server } = { server: new HttpServer() }) {
    this.server = server
  }

  use(usable: Addon<T>) {
    if ('middleware' in usable) {
      const mw = usable.middleware
      mw && this.use(mw)
    }
    if ('register' in usable && 'function' === typeof usable.register) {
      usable.register && this.setups.push(usable.register.bind(usable))
      usable.unregister && this.teardowns.push(usable.unregister.bind(usable))
    }

    if ('function' === typeof usable) {
      this.appBuilder.use(usable)
    }
    return this
  }

  async listen(options?: ListenOptions | number) {
    if (typeof options === 'number') {
      options = { port: options, host: 'localhost' }
    }

    if (!options) {
      options = { port: Number(process.env.PORT) || 0, host: 'localhost' }
    }

    if (this.starting) {
      throw new Error('Server is already starting')
    }
    this.starting = true
    const app = this.appBuilder.build(),
      handler = (req: IncomingMessage, res: ServerResponse) => {
        const context = new DefaultContext(req, res)
        context.app = this as any
        app((context as unknown) as T)
      }
    try {
      await compose(
        this.setups.map(x => {
          return (_: any, next: any) => Promise.resolve(x(this)).then(next)
        })
      )()
      this.server.on('request', handler)
      await new Promise((resolve, reject) => {
        this.server.listen(options, (error?: Error) => (error && reject(error)) || resolve())
      })
      this.teardowns.unshift(app => {
        return new Promise((resolve, reject) => {
          app.server.off('request', handler)
          app.server.close((error?: Error) => (error && reject(error)) || resolve())
        })
      })
    } finally {
      this.starting = false
    }
  }

  async close() {
    if (this.closing) {
      throw new Error('Server is already closing')
    }
    this.closing = true
    try {
      await compose(
        this.teardowns.map(x => {
          return (_: any, next: any) => Promise.resolve(x(this)).then(next)
        })
      )()
    } finally {
      this.closing = false
    }
  }
}
