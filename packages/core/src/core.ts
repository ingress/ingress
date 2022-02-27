import { isAnnotationFactory } from 'reflect-annotations'
import { Func, ModuleContainer, ModuleContainerContext } from './di.js'
import { compose, exec, ContinuationMiddleware, Middleware } from './compose.js'
import {
  Addon,
  AppState,
  ContextInitializer,
  guards,
  Startable,
  Stopable,
  Usable,
  UsableMiddleware,
} from './types.js'

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

export class Ingress<T extends ModuleContainerContext> {
  public readyState: AppState = AppState.New
  public container!: ModuleContainer
  public driver: any = null

  private contextBase: Partial<T> | undefined = undefined
  private mw: (UsableMiddleware | undefined)[] = []
  private setups: (Startable | undefined)[] = []
  private teardowns: (Stopable | undefined)[] = []
  private setupCtx: (ContextInitializer | undefined)[] = []

  constructor(options?: { context?: any; container?: ModuleContainer }) {
    this.contextBase = options?.context
    const container = options?.container || new ModuleContainer()
    this.container = container
  }

  initContext(ctx: Partial<T>): T {
    ctx = ctx || Object.create(this.contextBase || null)
    for (const init of this.setupCtx) {
      ctx = init!.initContext(ctx)
    }
    //TODO use proxy to monitor dynamic properties during dev?
    return ctx as T
  }

  #middleware: ContinuationMiddleware<T> | null = null
  get middleware(): ContinuationMiddleware<T> {
    if (this.#middleware) {
      return this.#middleware
    }
    const executor = (u: UsableMiddleware, context: T, next: Func) => {
        return u.middleware(context, next)
      },
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      app = this,
      mw = this.mw.filter((x) => x)
    this.setupCtx = this.setupCtx.filter((x) => x)
    return (this.#middleware = function middleware(ctx, next) {
      ctx = app.initContext(ctx as T)
      return exec(mw, ctx, next, executor)
    })
  }

  /**
   * Replace the passed usable with undefined, creating a sparse array.
   * @param usable
   */
  public unUse(usable: Addon<T>) {
    if (guards.isStartable(usable)) {
      const idx = this.setups.indexOf(usable)
      if (~idx) this.setups.splice(idx, 1, void 0)
    }
    if (guards.isStopable(usable)) {
      const idx = this.teardowns.indexOf(usable)
      if (~idx) this.teardowns.splice(idx, 1, void 0)
    }
    if (guards.checkUsableMiddleware(usable)) {
      const idx = this.mw.indexOf(usable)
      if (~idx) this.mw.splice(idx, 1, void 0)
    }
    if ('initContext' in usable) {
      const idx = this.setupCtx.indexOf(usable as ContextInitializer)
      if (~idx) this.setupCtx.splice(idx, 1, void 0)
    }
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
    if (guards.checkUsableMiddleware(usable)) {
      this.mw.push(usable)
      used = true
    }
    if (guards.isStartable(usable)) {
      this.setups.push(usable)
      used = true
    }

    if (guards.isStopable(usable)) {
      this.teardowns.push(usable)
      used = true
    }

    if (guards.isContextInitializer(usable)) {
      this.setupCtx.push(usable)
      used = true
    }

    if (isAnnotationFactory(usable)) {
      return this.use(usable().annotationInstance)
    }
    const usableContainer = { middleware: usable }
    if (guards.checkUsableMiddleware(usableContainer)) {
      this.mw.push(usableContainer)
      used = true
    }
    if (!used) {
      throw new TypeError('Unable to use: ' + usable)
    }
    return this
  }

  public async start(app?: Ingress<any>, next?: Func<Promise<void>>): Promise<Ingress<T>> {
    app ||= this
    const isRoot = app === this
    if (isRoot && !guards.canStart(app.readyState)) {
      return Promise.reject(new Error('Already started or starting'))
    }
    if (!isRoot) {
      // //register with the root's container
      // app.container.setup(this.container)
      this.container = app.container
    }
    if (isRoot) {
      this.use(this.container)
    }
    this.readyState = AppState.Starting
    await exec(this.setups, app, next, (u: Startable, ctx, nxt) => {
      return u ? u.start(ctx, nxt) : nxt()
    })
    this.readyState = AppState.Started
    if (!this.#initializer) this.readyState = AppState.Running
    return this
  }

  #initializer: Func | null = null
  registerDriver(driver: any, initializer: Func) {
    if (this.#initializer) throw new Error('Driver already registered')
    this.#initializer = initializer
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
        return this.#initializer?.()
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
      await exec(this.teardowns, app, next, (u: Stopable, ctx, nxt) => {
        return u ? u.stop(ctx, nxt) : nxt()
      })
    } finally {
      this.readyState = AppState.Stopped
    }
    return this
  }
}
