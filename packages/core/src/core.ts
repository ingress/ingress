import { Container, ContainerContext } from '@ingress/di'
import { isAnnotationFactory } from 'reflect-annotations'
import {
  compose,
  exec,
  ContinuationMiddleware,
  Middleware,
  isMiddlewareFunction,
} from './compose.js'
import { Addon, AppState, Func, Usable } from './types.js'

export {
  Usable,
  Addon,
  AppState,
  Func,
  compose,
  exec,
  Middleware,
  ContinuationMiddleware,
  ContainerContext,
}

const _middleware = Symbol('middleware')
export class Ingress<T extends ContainerContext> {
  public readyState: AppState = AppState.New
  public container!: Container
  private context: Partial<T> | undefined = undefined
  private mw: Middleware<T>[] = []
  private setups: Middleware<Ingress<any>>[] = []
  private teardowns: Middleware<Ingress<any>>[] = []
  private setupCtx: Usable[] = []

  constructor(options?: { context?: any; container?: Container }) {
    this.context = options?.context
    if (options?.container) {
      this.container = options.container
      this.use(this.container)
    }
  }

  initContext(ctx: Partial<T>): T {
    ctx = ctx || Object.create(this.context || null)
    for (const init of this.setupCtx) {
      ctx = init.initContext!(ctx)
      //TODO assert modifying reference at devtime?
    }
    return ctx as T
  }

  private [_middleware]: ContinuationMiddleware<T> | null = null
  get middleware(): ContinuationMiddleware<T> {
    if (this[_middleware]) {
      return this[_middleware]!
    }
    const mw = compose(this.mw)
    return (this[_middleware] = (ctx, next) => {
      ctx = this.initContext(ctx as T)
      return mw(ctx, next)
    })
  }

  public use(usable: Addon<T>): this {
    if (this.readyState === AppState.Started) {
      throw new Error('Already started, Cannot "use" something now')
    }
    let used = false
    if ('annotationInstance' in usable) {
      return this.use(usable.annotationInstance)
    }
    if ('middleware' in usable) {
      const mw = usable.middleware?.bind(usable)
      mw && this.use(mw)
      used = true
    }
    if ('start' in usable && 'function' === typeof usable.start) {
      this.setups.push(usable.start.bind(usable))
      'stop' in usable && this.teardowns.push(usable.stop!.bind(usable))
      used = true
    }
    if ('initContext' in usable) {
      this.setupCtx.push(usable as Usable)
      used = true
    }
    if (isAnnotationFactory(usable)) {
      return this.use(usable().annotationInstance)
    }
    if (isMiddlewareFunction(usable)) {
      if (usable.length !== 2) {
        throw new TypeError('Middleware must accept two arguments, context and next')
      }
      this.mw.push(usable)
      used = true
    }
    if (!used) {
      throw new TypeError('Unable to use: ' + usable)
    }
    return this
  }

  public async start(app?: Ingress<any>, next?: Func<Promise<void>>): Promise<Ingress<T>> {
    app = app || this
    if (
      (app === this && app.readyState === AppState.Starting) ||
      app.readyState === AppState.Started
    ) {
      return Promise.reject(new Error('Already started or starting'))
    }
    if (app !== this) {
      this.container = app.container
    } else if (!this.container) {
      this.use((this.container = new Container()))
      //TODO SOMEDAY conceptualize Usable prioritization
      this.setups.unshift(this.setups.pop()!)
      this.mw.unshift(this.mw.pop()!)
    }
    this.readyState = AppState.Starting
    await exec(app, this.setups, next)
    this.readyState = AppState.Started
    return this
  }

  public async stop(app?: Ingress<any>, next?: Func<Promise<void>>): Promise<Ingress<T>> {
    app = app || this
    if (
      (app === this && AppState.Stopping === app.readyState) ||
      [AppState.Stopped, AppState.New].includes(app.readyState)
    ) {
      throw new Error('Already stopped or stopping')
    }
    this.readyState = AppState.Stopping
    try {
      await exec(app, this.teardowns, next)
    } finally {
      this.readyState = AppState.Stopped
    }
    return this
  }
}
