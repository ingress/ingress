import { AppBuilder, Middleware, compose, functionList } from 'app-builder'
import { BaseContext, DefaultContext, BaseAuthContext } from './context'
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { RouterAddon, Type } from './router/router'
import { DefaultMiddleware } from './default-middleware'
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
type AuthContextFactory<
  T extends BaseContext<T, A> = BaseContext<any, any>,
  A extends BaseAuthContext = BaseAuthContext
> = (options: T) => Promise<A> | A
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
  onError,
  contextToken,
  router,
}: {
  preRoute?: Addon<T>
  authContextFactory?: AuthContextFactory
  contextToken?: any
  onError?: (context: T) => Promise<any>
  router?: { routes?: Type<any>[]; baseUrl?: string; typeConverters?: TypeConverter<any>[] }
} = {}) {
  const controllers = router?.routes ?? [],
    routeRoot = router?.baseUrl ?? '/',
    defaultMiddleware = onError ? new DefaultMiddleware<T, A>({ onError }) : new DefaultMiddleware<T, A>(),
    server = new Ingress<T, A>(),
    authContextFactory = authenticator || (() => ({ authenticated: false })),
    container = new Container({ contextToken: contextToken || Context }),
    routerAddon = new RouterAddon<T>({ controllers, typeConverters: router?.typeConverters ?? [], baseUrl: routeRoot })

  server
    .use(defaultMiddleware)
    .use({
      //Copy routes from router, and register them with the DI container
      start() {
        container.serviceCollector.items.push(...routerAddon.controllerCollector.items)
      },
    })
    .use(container)
    .use(async (context, next) => {
      context.authContext = (await authContextFactory(context)) as A
      return next()
    })

  preRoute && server.use(preRoute)
  server.use(routerAddon)

  return Object.assign(server, {
    container,
    router,
    Controller: routerAddon.Controller,
    Service: container.Service,
    SingletonService: container.SingletonService,
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
      if (usable.length < 2) {
        throw new TypeError('middleware function must have at least an arity of two')
      }
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

  public async start(app?: Ingress): Promise<void> {
    if (this.starting || this.started) {
      throw new Error('Already started or starting')
    }
    if (!this.server && app && app.server) {
      this.server = app.server
    }
    this.starting = true
    this.stopping = this.stopped = false
    await compose(functionList(this.setups.map((x) => x.bind(null, this))))()
    this.starting = false
    this.started = true
  }

  public close() {
    return this.stop()
  }

  public async stop(): Promise<void> {
    if (this.stopping || this.stopped) {
      throw new Error('Already stopped or stopping')
    }
    this.stopping = true
    this.starting = this.started = false
    try {
      await compose(functionList(this.teardowns.map((x) => x.bind(null, this))))()
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
      this.server?.on('request', handler)
      await new Promise((resolve, reject) => {
        this.server?.listen(options, (error?: Error) => (error ? reject(error) : resolve()))
      })
      this.teardowns.unshift((app) => {
        return new Promise((resolve, reject) => {
          app.server?.off('request', handler)
          app.server?.close((error?: Error) => (error ? reject(error) : resolve()))
        })
      })
    } finally {
      this.starting = false
    }
  }
}
