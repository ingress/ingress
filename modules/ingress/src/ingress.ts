import { AppBuilder, Middleware, compose, functionList } from 'app-builder'
import { BaseContext, DefaultContext, BaseAuthContext } from './context'
import { Annotation, isAnnotationFactory } from 'reflect-annotations'
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'

function isMiddlewareFunction(thing: any): thing is (...args: any[]) => any {
  if ('function' !== typeof thing) {
    return false
  }
  //ensure this is not a class constructor.
  const props = Object.getOwnPropertyNames(thing)
  return !props.includes('prototype') || props.includes('arguments')
}

/**
 * @public
 */
export class Ingress<T extends BaseContext<T, A> = DefaultContext, A extends BaseAuthContext = BaseAuthContext> {
  private appBuilder = new AppBuilder<T>()
  private stopping = false
  private starting = false
  private stopped = false
  private started = false
  private setups: SetupTeardown[] = []
  private teardowns: SetupTeardown[] = []
  public server?: HttpServer

  constructor(options?: { server?: HttpServer }) {
    if (options?.server) {
      this.server = options.server
    }
  }

  use(usable: Addon<T>): this {
    let used = false
    if ('annotationInstance' in usable) {
      return this.use(usable.annotationInstance)
    }
    if ('middleware' in usable) {
      const mw = usable.middleware
      mw && this.use(mw)
      used = true
    }
    if ('start' in usable && 'function' === typeof usable.start) {
      this.setups.push(usable.start.bind(usable))
      usable.stop && this.teardowns.push(usable.stop.bind(usable))
      used = true
    }
    if (isMiddlewareFunction(usable)) {
      if (usable.length < 2) {
        throw new TypeError('middleware function must have at least an arity of two')
      }
      this.appBuilder.use(usable)
      used = true
    }

    if (isAnnotationFactory(usable)) {
      used = true
      //unwrap factory...
      return this.use(usable().annotationInstance)
    }

    if (!used) {
      throw new TypeError('ingress was unable to use: ' + usable)
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
    return this.server.address()
  }
}

/**
 * @public
 */
export interface SetupTeardown {
  (server: Ingress<any>): Promise<any> | any
}
/**
 * @public
 */
export interface Usable<T> {
  start?: SetupTeardown
  stop?: SetupTeardown
  middleware?: Middleware<T>
}

/**
 * @public
 */
export type Addon<T> = (Annotation<Usable<T>> | Usable<T> | (Usable<T> & Middleware<T>)) & { [key: string]: any }
/**
 * @public
 */
export interface ListenOptions {
  port?: number
  host?: string
  path?: string
  backlog?: number
  exclusive?: boolean
  readableAll?: boolean
  writableAll?: boolean
}
