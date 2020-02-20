import { AppBuilder, Middleware, compose, functionList } from 'app-builder'
import { BaseContext, DefaultContext, BaseAuthContext, Request } from './context'
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { WebsocketAddon } from './websocket/websocket-addon'
import { RouterAddon, Type } from './router/router'
import { DefaultMiddleware } from './default-middleware'
import { Websockets } from './websocket/websockets'
export * from '@ingress/http-status'
import { Container } from '@ingress/di'
import { TypeConverter } from './router/type-converter'
interface SetupTeardown {
  (server: Ingress<any>): Promise<any> | any
}

interface Usable<T> {
  start?: SetupTeardown
  stop?: SetupTeardown
  middleware?: Middleware<T>
}

type Addon<T> = (Usable<T> | (Usable<T> & Middleware<T>)) & { [key: string]: any }
type AuthContextFactory = (options: {
  req: Request<BaseContext<any, any>>
}) => Promise<BaseAuthContext> | BaseAuthContext
interface ListenOptions {
  port?: number
  host?: string
  path?: string
  backlog?: number
  exclusive?: boolean
  readableAll?: boolean
  writableAll?: boolean
}
//BaseContext Definition and Token
class Context extends BaseContext<Context, BaseAuthContext> {}
//Type Exports
export { Addon, AuthContextFactory, ListenOptions, Context, Type, BaseAuthContext, BaseContext, Middleware }
//Other Exports
export * from './annotations'
export * from './router/router'
export * from '@ingress/di'
export { DefaultContext, compose, ingress }
export type IngressApp = ReturnType<typeof ingress>
export default function ingress<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
>({
  preRoute,
  authContextFactory: authenticator,
  typeConverters,
  contextToken,
  routes,
  websockets
}: {
  preRoute?: Addon<T>
  authContextFactory?: AuthContextFactory
  typeConverters?: TypeConverter<any>[]
  contextToken?: any
  routes?: Type<any> | Type<any>[]
  websockets?: boolean
} = {}) {
  const controllers = Array.isArray(routes) ? routes : (routes && [routes]) || [],
    server = new Ingress<T, A>().use(new DefaultMiddleware<T, A>()),
    authContextFactory = authenticator || (() => ({ authenticated: false })),
    container = new Container({ contextToken: contextToken || Context }),
    router = new RouterAddon<T>({ controllers, typeConverters: typeConverters || [] })

  websockets = websockets ? true : false

  server
    .use({
      //Add routes as container services
      start() {
        container.serviceCollector.items.push(...router.controllerCollector.items)
      }
    })
    .use(container)
    .use(async (context, next) => {
      context.authContext = (await authContextFactory(context)) as A
      return next()
    })

  if (preRoute) {
    server.use(preRoute)
  }

  server.use(router)

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
    container,
    router,
    Controller: router.Controller,
    Service: container.Service,
    SingletonService: container.SingletonService
  })
}

export class Ingress<T extends BaseContext<T, A> = DefaultContext, A extends BaseAuthContext = BaseAuthContext> {
  private appBuilder = new AppBuilder<T>()
  private stopping = false
  private starting = false
  private stopped = false
  private started = false
  private setups: SetupTeardown[] = []
  private teardowns: SetupTeardown[] = []
  public server?: HttpServer
  public websockets?: Websockets

  constructor({ server }: { server?: HttpServer } = {}) {
    if (server) {
      this.server = server
    }
  }

  use(usable: Addon<T>) {
    if ('middleware' in usable) {
      const mw = usable.middleware
      mw && this.use(mw)
    }
    if ('start' in usable && 'function' === typeof usable.start) {
      this.setups.push(usable.start.bind(usable))
      usable.stop && this.teardowns.push(usable.stop.bind(usable))
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

  get middleware() {
    return this.appBuilder.build()
  }

  public async start(): Promise<void> {
    if (this.starting || this.started) {
      throw new Error('Already started or starting')
    }
    this.starting = true
    this.stopping = this.stopped = false
    await compose(functionList(this.setups.map(x => x.bind(null, this))))()
    this.starting = false
    this.started = true
  }

  public async stop(): Promise<void> {
    if (this.stopping || this.stopped) {
      throw new Error('Already stopped or stopping')
    }
    this.stopping = true
    this.starting = this.started = false
    try {
      await compose(functionList(this.teardowns.map(x => x.bind(null, this))))()
    } finally {
      this.stopped = true
      this.stopping = false
    }
  }

  public async listen(options?: ListenOptions | number) {
    if (!this.server) {
      this.server = new HttpServer()
    }
    const mw = this.middleware,
      handler = (req: IncomingMessage, res: ServerResponse) => mw(this.createContext(req, res))

    if (!this.started || !this.starting) {
      await this.start()
    }
    try {
      this.server.on('request', handler)
      await new Promise((resolve, reject) => {
        this.server!.listen(options, (error?: Error) => (error ? reject(error) : resolve()))
      })
      this.teardowns.unshift(app => {
        return new Promise((resolve, reject) => {
          app.server!.off('request', handler)
          app.server!.close((error?: Error) => (error ? reject(error) : resolve()))
        })
      })
    } finally {
      this.starting = false
    }
  }
}
