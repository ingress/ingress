import { isAnnotationFactory } from 'reflect-annotations'
import { Func, ModuleContainer, ModuleContainerContext } from './di.js'
import { exec, ContinuationMiddleware, executeByArity, Middleware } from './compose.js'
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

const _hosts = Symbol('ingress.hosts'),
  _middleware = Symbol('ingress.middleware')

class Ingress<T extends ModuleContainerContext> {
  static [_hosts] = new WeakMap<any, Ingress<any>>();
  [_middleware]: ContinuationMiddleware<T> | null = null

  public readyState: AppState = AppState.New
  public container!: ModuleContainer
  public driver: any = null

  private contextBase: Partial<T> | undefined = undefined
  private mw: UsableMiddleware<T>[] = []
  private setups: (Startable | undefined)[] = []
  private teardowns: (Stopable | undefined)[] = []
  private setupCtx: (ContextInitializer | undefined)[] = []

  constructor(options?: { context?: any; container?: ModuleContainer }) {
    this.contextBase = options?.context
    this.container = options?.container || new ModuleContainer()
  }

  extendContext(ctx: Partial<T>): T {
    ctx = ctx || Object.create(this.contextBase || null)
    for (const init of this.setupCtx) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ctx = init!.extendContext(ctx)
    }
    //SOMEDAY use proxy to monitor dynamic properties during dev?
    return ctx as T
  }
  get middleware(): ContinuationMiddleware<T> {
    if (this[_middleware]) {
      return this[_middleware]!
    }
    const executor = (u: UsableMiddleware<T>, context: T, next: Func) => {
        return u.middleware(context, next)
      },
      mw = this.mw.filter((x) => x)

    this.setupCtx = this.setupCtx.filter((x) => x)
    return (this[_middleware] = (ctx, next) => {
      ctx = this.extendContext(ctx as T)
      return exec(mw, ctx, next, executor)
    })
  }

  /**
   * @param usable
   */
  public unUse(usable: Addon<T>) {
    const host = Ingress[_hosts].get(usable)
    if (!host) {
      throw new Error("Unable to unUse an addon that has not been use'd")
    }
    ;(['setups', 'teardowns', 'mw', 'setupCtx'] as const).forEach((name) => {
      const list: any[] = host[name],
        idx = list.indexOf(usable)
      if (~idx) list.splice(idx, 1, void 0)
    })
    Ingress[_hosts].delete(usable)
  }

  public finalize(forwardRefs: Iterable<any>) {
    const setups = this.setups.slice()
    for (const forward of forwardRefs) {
      this.use(this.container.get(forward))
    }
    const finalSetups = this.setups.filter((x) => !setups.includes(x))
    return exec(finalSetups, this, void 0, startableExecutor)
  }

  public use(...usables: Addon<T>[]): this {
    if (usables.length > 1) {
      for (const x of usables) this.use(x)
      return this
    }
    let [usable] = usables
    if ([AppState.Started, AppState.Running].includes(this.readyState)) {
      throw new Error('Already started, Cannot "use" something now')
    }
    let used = false
    if ('annotationInstance' in usable) {
      return this.use(usable.annotationInstance)
    }
    if (guards.isMiddleware<T>(usable)) {
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

    if (typeof usable === 'function') {
      usable = { middleware: usable }
      if (guards.checkUsableMiddleware(usable)) {
        this.mw.push(usable)
        used = true
      }
    }

    if (!used) {
      throw new TypeError('Unable to use: ' + usable)
    }

    Ingress[_hosts].set(usable, this)

    return this
  }

  public async start(app?: Ingress<any>, next?: Func<Promise<void>>): Promise<Ingress<T>> {
    app ||= this
    const isRoot = app === this
    if (isRoot && !guards.canStart(app.readyState)) {
      return Promise.reject(new Error('Already started or starting'))
    }
    if (!isRoot) {
      this.container = app.container
    } else {
      this.use(this.container)
    }

    this.readyState = AppState.Starting
    await exec(this.setups, app, next, startableExecutor)
    this.readyState = AppState.Started
    if (!this.#initializer) this.readyState = AppState.Running
    return this
  }

  #initializer: Func | null = null
  registerDriver(driver: any, init: Func) {
    if (this.#initializer) throw new Error('Driver already registered')
    this.#initializer = init
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
        await this.#initializer?.()
      } finally {
        this.readyState = AppState.Running
      }
    }
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
      await exec(this.teardowns, app, next, executeByArity.bind(null, 'stop'))
    } finally {
      this.readyState = AppState.Stopped
    }
    return this
  }
}

const startableExecutor = executeByArity.bind(null, 'start')

/** Core Objects */
/** Main and Factory Exports */
export { Ingress, AppState }
export default ingress
export function ingress<T extends ModuleContainerContext>(
  ...args: ConstructorParameters<typeof Ingress>
) {
  return new Ingress<T>(...args)
}

/** Core Types */
export type { Addon, UsableMiddleware, Startable, Stopable, ContextInitializer, Middleware, Usable }

/** compositional execution helpers */
export { compose, exec } from './compose.js'

/** dependency injection */
export {
  Func,
  Type,
  Provider,
  InjectionToken,
  Injectable,
  ModuleContainer,
  ContextToken,
  createContainer,
} from './di.js'
export type { ModuleContainerOptions, Injector, ModuleContainerContext } from './di.js'
