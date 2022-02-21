import { isAnnotationFactory } from 'reflect-annotations'
import { ModuleContainer, ModuleContainerContext } from './di.js'
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
  ModuleContainerContext,
}

export * from './di.js'

const _middleware = Symbol('middleware'),
  _initializer = Symbol('driver')

export class Ingress<T extends ModuleContainerContext> {
  public readyState: AppState = AppState.New
  public container!: ModuleContainer
  public driver: any = null

  private contextBase: Partial<T> | undefined = undefined
  private mw: Middleware<T>[] = []
  private setups: Middleware<Ingress<any>>[] = []
  private teardowns: Middleware<Ingress<any>>[] = []
  private setupCtx: Usable[] = []

  constructor(options?: { context?: any; container?: ModuleContainer }) {
    this.contextBase = options?.context
    const container = options?.container || new ModuleContainer()
    this.container = container
  }

  initContext(ctx: Partial<T>): T {
    ctx = ctx || Object.create(this.contextBase || null)
    for (const init of this.setupCtx) {
      ctx = init.initContext!(ctx)
      //TODO use proxy to monitor dynamic properties during dev?
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

  public use(...usables: Addon<T>[]): this {
    if (usables.length > 1) {
      for (const x of usables) this.use(x)
      return this
    }
    const [usable] = usables
    if ([AppState.Started, AppState.Running].includes(this.readyState)) {
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
      used = true
    }

    if ('stop' in usable) {
      this.teardowns.push(usable.stop!.bind(usable))
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
    const isRoot = app === this
    if (
      isRoot &&
      [AppState.Starting, AppState.Started, AppState.Running].includes(app.readyState)
    ) {
      return Promise.reject(new Error('Already started or starting'))
    }
    if (!isRoot) {
      //merge sub app container into root apps' container
      app.container.initWith(this.container)
      this.container = app.container
    } else {
      this.use(this.container)
      this.setups.unshift(this.setups.pop()!)
      this.mw.unshift(this.mw.pop()!)
    }
    this.readyState = AppState.Starting
    await exec(this.setups, app, next)
    this.readyState = AppState.Started
    if (!this[_initializer]) this.readyState = AppState.Running
    return this
  }

  private [_initializer]: Func | null = null
  registerDriver(driver: any, initializer: Func) {
    if (this[_initializer]) throw new Error('Driver already registered')
    this[_initializer] = initializer
    this.driver = driver
  }

  async run() {
    if ([AppState.Stopped, AppState.Stopping].includes(this.readyState)) {
      throw new Error('Cannot run a stopped app')
    }
    if (this.readyState === AppState.New) {
      await this.start()
    }
    if (this.readyState !== AppState.Running) {
      try {
        return this[_initializer]?.()
      } finally {
        this.readyState = AppState.Running
      }
    }
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
      await exec(this.teardowns, app, next)
    } finally {
      this.readyState = AppState.Stopped
    }
    return this
  }
}
