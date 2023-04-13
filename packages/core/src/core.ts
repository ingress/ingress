import type { Annotation, AnnotationFactory } from 'reflect-annotations'
import { isAnnotationFactory, isAnnotationInstance } from 'reflect-annotations'
import type { Func, CoreContext, PriorityOptions } from './di.js'
import { Logger } from './logger.js'
import { ModuleContainer, DependencyCollectorList, resolveForwardRef } from './di.js'
import type { ContinuationMiddleware, NextFn, Middleware } from './compose.js'
import { exec, executeByArity } from './compose.js'
import type {
  Addon,
  ContextInitializer,
  EmptyExtend,
  Startable,
  StartAndExtend,
  Stoppable,
  Usable,
  UsableMiddleware,
} from './types.js'
import { AppState, guards } from './types.js'

const _hosts = Symbol('ingress.hosts')

class Ingress<T extends CoreContext, D = EmptyExtend> {
  static [_hosts] = new WeakMap<any, Ingress<any>>()
  private _middleware: ContinuationMiddleware<T> | null = null

  public readyState: AppState = AppState.New
  public container!: ModuleContainer
  public driver: any = null

  private contextBase: Partial<T> | undefined = undefined
  private mw: UsableMiddleware<T>[] = []
  private setups: (Startable | undefined)[] = []
  private teardowns: (Stoppable | undefined)[] = []
  private setupCtx: (ContextInitializer<T> | undefined)[] = []

  constructor(options?: { context?: any; container?: ModuleContainer }) {
    this.contextBase = options?.context
    this.container = options?.container || new ModuleContainer()
  }

  initializeContext(ctx: CoreContext): T {
    ctx = ctx || Object.create(this.contextBase || null)
    for (const init of this.setupCtx) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ctx = init!.initializeContext(ctx)
    }
    //SOMEDAY use proxy to monitor dynamic properties during dev?
    return ctx as T
  }

  get middleware(): ContinuationMiddleware<T> {
    if (this._middleware) {
      return this._middleware as ContinuationMiddleware<T>
    }
    function executor(u: UsableMiddleware<T>, context: T, next: NextFn) {
      return u.middleware(context, next)
    }
    const prioritized: [PriorityOptions, UsableMiddleware<T>][] = [],
      sorted: UsableMiddleware<T>[] = []
    for (const mw of this.mw) {
      if (!mw) continue
      const priority = DependencyCollectorList.priorities.get(mw.constructor)
      if (priority) prioritized.push([priority, mw])
      else sorted.push(mw)
    }
    let l = prioritized.length
    const cap = 2 * l
    let i = 0
    while (l) {
      if (++i > cap) throw new Error('Unable to satisfy priority order')
      const unpicked = prioritized.slice()
      for (let j = 0; j < unpicked.length; j++) {
        const [{ priority }, mw] = unpicked[j]
        let idx = sorted.findIndex(
          (x) => x instanceof resolveForwardRef(priority.before || priority.after)
        )
        if (idx === -1) continue
        if (priority.after) idx += 1
        l--
        prioritized.splice(j, 1)
        sorted.splice(idx, 0, mw)
      }
    }

    this.setupCtx = this.setupCtx.filter((x) => x)
    return (this._middleware = (ctx, next) => {
      ctx = this.initializeContext(ctx as T)
      return exec(sorted, ctx, next, executor)
    })
  }

  /**
   * @param usable
   */
  public unUse(usable: any) {
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

  public async finalize(forwardRefs: Iterable<any>): Promise<void> {
    const setups = this.setups.slice()
    for (const forward of forwardRefs) {
      this.use(this.container.get(forward))
    }
    const finalSetups = this.setups.filter((x) => !setups.includes(x))

    await addDecorations(finalSetups, this as any, void 0)
  }

  public use<Extensions = EmptyExtend, NewDecorations = EmptyExtend>(
    usable: StartAndExtend<Extensions, NewDecorations> & Partial<Usable<T, Extensions>>
  ): Ingress<T & Extensions, D & NewDecorations>
  public use<Extensions = EmptyExtend>(
    usable: ContextInitializer<Extensions> & Partial<Usable<T, Extensions>>
  ): Ingress<T & Extensions, D>
  public use<NewDecorations = EmptyExtend>(
    usable: Startable<NewDecorations> & Partial<Usable<T, EmptyExtend>>
  ): Ingress<T, D & NewDecorations>
  public use(usable: Partial<Usable<T, EmptyExtend>>): Ingress<T, D>
  public use(usable: UsableMiddleware<T>['middleware']): Ingress<T, D>

  public use<Extensions extends CoreContext, Decorations>(
    app: Ingress<Extensions, Decorations>
  ): Ingress<T & Extensions, D & Decorations>

  public use<U>(
    annotation: Annotation<U>
  ): U extends StartAndExtend<infer Extensions, infer NewDecorations>
    ? Ingress<T & Extensions, D & NewDecorations>
    : U extends ContextInitializer<infer Extensions>
    ? Ingress<T & Extensions, D>
    : U extends Startable<infer NewDecorations>
    ? Ingress<T, D & NewDecorations>
    : Ingress<T, D>

  public use<U>(
    factory: AnnotationFactory<U>
  ): U extends StartAndExtend<infer Extensions, infer NewDecorations>
    ? Ingress<T & Extensions, D & NewDecorations>
    : U extends ContextInitializer<infer Extensions>
    ? Ingress<T & Extensions, D>
    : U extends Startable<infer NewDecorations>
    ? Ingress<T, D & NewDecorations>
    : Ingress<T, D>

  public use<Extensions = EmptyExtend, Decorations = EmptyExtend>(
    usable: Addon<T, Extensions, Decorations>
  ): any {
    if (AppState.Started & this.readyState || AppState.Running & this.readyState) {
      throw new Error('Already started, Cannot "use" now')
    }
    let used = false
    if (isAnnotationInstance(usable)) {
      return this.use(usable.annotationInstance) as any
    }
    if (guards.hasMiddleware<T>(usable)) {
      if (guards.checkUsableMiddleware<T>(usable)) {
        this.mw.push(usable)
        used = true
      }
    }
    if (guards.isStartable(usable)) {
      this.setups.push(usable)
      used = true
    }
    if (guards.isStoppable(usable)) {
      this.teardowns.push(usable)
      used = true
    }
    if (guards.isContextInitializer<T>(usable)) {
      this.setupCtx.push(usable)
      used = true
    }
    if (isAnnotationFactory(usable)) {
      return this.use(usable().annotationInstance) as any
    }
    if (typeof usable === 'function') {
      usable = { middleware: usable } as any
      if (guards.checkUsableMiddleware<T>(usable)) {
        this.mw.push(usable)
        used = true
      }
    }
    if (!used) {
      throw new TypeError('Unable to use: ' + usable)
    }
    Ingress[_hosts].set(usable, this as any)
    return this
  }

  public async start(app?: Ingress<any, any>, next?: NextFn): Promise<Ingress<T, never> & D> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    app ||= this
    const isRoot = app === this
    if (isRoot && !guards.canStart(app.readyState)) {
      return Promise.reject(new Error('Already started or starting'))
    }
    if (isRoot) {
      this.use(this.container)
    } else {
      this.container = app.container
    }

    this.readyState |= AppState.Starting
    await addDecorations(this.setups, app, next)
    this.readyState |= AppState.Started
    if (!this.#initializer) this.readyState |= AppState.Running
    return this as any
  }

  #initializer: Func | null = null
  registerDriver(driver: any, init: Func) {
    if (this.#initializer) throw new Error('Driver already registered')
    this.#initializer = init
    this.driver = driver
  }

  async run(): Promise<Ingress<T, never> & D> {
    if (AppState.Stopped & this.readyState || AppState.Stopping & this.readyState) {
      throw new Error('Cannot run a stopped app')
    }
    if (this.readyState === AppState.New) {
      await this.start()
    }

    if (!(this.readyState & AppState.Running)) {
      try {
        await this.#initializer?.()
      } finally {
        this.readyState |= AppState.Running
      }
    }
    return this as any as Ingress<T, never> & D
  }

  public async stop(app?: Ingress<any, any>, next?: Func<Promise<void>>): Promise<Ingress<T, D>> {
    app = app || this
    if (
      app === this &&
      (app.readyState & AppState.Stopping ||
        app.readyState & AppState.Stopping ||
        app.readyState & AppState.New)
    ) {
      throw new Error('Already stopped or stopping')
    }
    this.readyState |= AppState.Stopping
    try {
      await exec(this.teardowns, app, next, executeByArity.bind(null, 'stop', undefined))
    } finally {
      this.readyState = AppState.New
      this.readyState |= AppState.Stopped
    }
    return this
  }
}

async function addDecorations(setups: (Startable | undefined)[], app: Ingress<any>, next?: NextFn) {
  const results: any[] = [],
    startableExecutor = executeByArity.bind(null, 'start', results)
  await exec(setups, app, next, startableExecutor)
  const decorations = await Promise.all(results.flat())
  decorations
    .filter((x) => x && !(x instanceof Ingress))
    .forEach((dec) => {
      Object.assign(app, dec)
    })
}

/** Core Objects */
/** Main and Factory Exports */
export { Ingress, AppState, Logger }
export default ingress
export function ingress<T extends CoreContext>(...args: ConstructorParameters<typeof Ingress>) {
  return new Ingress<T>(...args)
}

/** Core Types */
export type {
  Addon,
  UsableMiddleware,
  Startable,
  Stoppable,
  ContextInitializer,
  Middleware,
  Usable,
  ContinuationMiddleware,
  NextFn,
}

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
  forwardRef,
} from './di.js'
export type { ModuleContainerOptions, Injector, CoreContext } from './di.js'
