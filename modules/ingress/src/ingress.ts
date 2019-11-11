import { AppBuilder, Middleware, compose } from 'app-builder'
import { BaseContext, DefaultContext, BaseAuthContext, Request } from './context'
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { WebsocketAddon } from './websocket/websocket-addon'
import { RouterAddon, Type } from './router/router'
import { DefaultMiddleware } from './default-middleware'
import { Websockets } from './websocket/websockets'
import { Container } from '@ingress/di'

interface SetupTeardown {
  (server: Ingress<any>): Promise<any> | any
}

interface Usable<T> {
  register?: SetupTeardown
  unregister?: SetupTeardown
  middleware?: Middleware<T>
}

export type Addon<T> = (Usable<T> | (Usable<T> & Middleware<T>)) & { [key: string]: any }
export type Authenticator = (options: {
  req: Request<BaseContext<any, any>>
}) => Promise<BaseAuthContext> | BaseAuthContext

export interface ListenOptions {
  port?: number
  host?: string
  path?: string
  backlog?: number
  exclusive?: boolean
  readableAll?: boolean
  writableAll?: boolean
}

export { AfterRequest } from './annotations'
export * from './router/router'
export { ingress }
export default function ingress<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
>(
  {
    authenticator,
    routes,
    websockets
  }: { authenticator?: Authenticator; routes?: Type<any> | Type<any>[]; websockets?: boolean } = {
    routes: []
  }
) {
  const controllers = Array.isArray(routes) ? routes : (routes && [routes]) || [],
    server = new Ingress<T, A>().use(new DefaultMiddleware<T, A>()),
    authContextFactory = authenticator || (() => ({ authenticated: false })),
    container = new Container(),
    router = new RouterAddon<T>({ controllers })

  websockets = websockets ? true : false

  const collector = (container.serviceCollector = router.controllerCollector).collect

  server
    .use(container)
    .use(async (context, next) => {
      context.authContext = (await authContextFactory(context)) as A
      return next()
    })
    .use(router)

  if (websockets) {
    server.use(
      new WebsocketAddon({
        contextFactory: async req => {
          const context = server.createContext(req, {} as any)
          context.authContext = (await authContextFactory(context)) as A
          return context
        }
      })
    )
  }

  return Object.assign(server, {
    Controller: collector,
    Service: collector,
    SingletonService: container.SingletonService
  })
}

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

  public createContext(req: IncomingMessage, res: ServerResponse): T {
    const context = new DefaultContext(req, res) as any
    context.app = this
    return context
  }

  private handler() {
    const app = this.appBuilder.build()
    return (req: IncomingMessage, res: ServerResponse) => app(this.createContext(req, res))
  }

  public async listen(options?: ListenOptions | number) {
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
    const handler = this.handler()
    try {
      await compose(
        this.setups.map(x => {
          return (_: any, next: any) => Promise.resolve(x(this)).then(next)
        })
      )()
      this.server.on('request', handler)
      await new Promise((resolve, reject) => {
        this.server.listen(options, (error?: Error) => (error ? reject(error) : resolve()))
      })
      this.teardowns.unshift(app => {
        return new Promise((resolve, reject) => {
          app.server.off('request', handler)
          app.server.close((error?: Error) => (error ? reject(error) : resolve()))
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
