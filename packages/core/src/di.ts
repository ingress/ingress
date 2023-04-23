import type {
  Provider,
  ResolvedReflectiveProvider,
  ResolvedReflectiveFactory,
  ValueProvider,
} from 'injection-js'
import { ReflectiveInjector, InjectionToken, ReflectiveKey } from 'injection-js'

import type { Type, DependencyCollector, DependencyProvider } from './collector.js'
import { DependencyCollectorList } from './collector.js'
import type { NextFn } from './compose.js'

import type { Startable } from './types.js'
import { Logger } from './logger.js'
import { isTestEnv } from './util.js'
/* c8 ignore next */
export * from './collector.js'
export { Provider, Injectable, InjectionToken } from 'injection-js'

const kForwardRef = Symbol.for('ingress.forwardRef')

export function resolveForwardRef<T>(fn: T | (() => T)): T {
  if (typeof fn === 'function' && (fn as any)[kForwardRef]) {
    return (fn as any)() as T
  }
  return fn as T
}

export function forwardRef(fn: () => Type<any>): () => Type<any> {
  return Object.assign(fn, { [kForwardRef]: true })
}

export interface Injector {
  get<T>(token: Type<T> | InjectionToken<T>, notFoundValue?: T): T
}

/**
 * @public
 */
export interface CoreContext {
  scope: Injector
}

/**
 * @public
 */
export interface ModuleContainerOptions {
  contextToken?: Record<string, any>
  singletons?: Provider[]
  services?: Provider[]
}

const EMPTY_DEPS: Array<any> = [],
  ContextToken = new InjectionToken('ingress.context')

export { ContextToken }

/**
 * @public
 */
export class ModuleContainer implements Injector, Startable {
  private rootInjector: ReflectiveInjector | null = null
  private resolvedChildProviders: ResolvedReflectiveProvider[] = []
  private ResolvedContextProvider: Type<ResolvedReflectiveProvider>

  public singletonCollector = new DependencyCollectorList()
  public serviceCollector = new DependencyCollectorList()
  public forwardRefCollector = new DependencyCollectorList()
  public ContextToken = ContextToken
  public singletons: Provider[] = []
  public services: Provider[] = []

  public get SingletonService(): DependencyCollector {
    return this.singletonCollector.collect
  }
  public get Service(): DependencyCollector {
    return this.serviceCollector.collect
  }

  public get UseSingleton(): DependencyCollector {
    return this.forwardRefCollector.collect
  }

  constructor({
    singletons = [],
    services = [],
    contextToken = ContextToken,
  }: ModuleContainerOptions = {}) {
    Object.assign(this, { singletons, services })
    const key = ReflectiveKey.get(contextToken)
    this.ResolvedContextProvider = class<T> implements ResolvedReflectiveProvider {
      key = key
      resolvedFactories: ResolvedReflectiveFactory[]
      multiProvider = false
      constructor(value: T) {
        this.resolvedFactories = [
          {
            factory() {
              return value
            },
            dependencies: EMPTY_DEPS,
          },
        ]
      }
    }
  }

  public registerSingleton(...providers: Provider[]) {
    if (this.rootInjector) {
      throw new Error('Cannot register provider on existing container')
    }
    this.singletons.push(...providers)
  }

  public registerScoped(...providers: Provider[]) {
    if (this.rootInjector) {
      throw new Error('Cannot register provider on existing container')
    }
    this.services.push(...providers)
  }

  public get<T = any>(token: Type<T> | InjectionToken<T>, notFoundValue?: T): T {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.rootInjector!.get(token, notFoundValue)
  }

  private createChild(...providers: Array<ResolvedReflectiveProvider>): Injector {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.rootInjector!.createChildFromResolved(this.resolvedChildProviders.concat(providers))
  }

  public createChildWithContext<T = any>(context: T): Injector {
    return this.createChild(new this.ResolvedContextProvider(context))
  }

  public async start(app?: any, next?: NextFn): Promise<any> {
    if (next) {
      await next()
    }
    if (app?.container) {
      app.container.setup(this)
      if (app.container !== this) {
        //remove sub-container initializers from the initializeContext pipeline.
        app.unUse(this)
      }
    }
    if (!app?.container) this.setup()
    return app?.finalize(this.forwardRefCollector.items)
  }

  public setup(container = this) {
    this.singletons = this.getAllSingletons(container)
    this.services = uniqProviders(this.services, container.serviceCollector.items)

    this.rootInjector = ReflectiveInjector.resolveAndCreate(this.singletons)
    this.resolvedChildProviders = ReflectiveInjector.resolve(this.services)
  }

  private getAllSingletons(container = this) {
    const defaultProviders = [Logger],
      providers = uniqProviders(
        this.singletons,
        container.singletons,
        container.singletonCollector.items,
        container.forwardRefCollector.items,
        defaultProviders
      )

    return providers
  }

  initializeContext(ctx: any): any {
    ctx.scope ||= this.createChildWithContext(ctx)
    return ctx
  }

  public findProvidedSingleton<T = any>(item: Type<T> | InjectionToken<any>): T | undefined {
    const singletons = this.getAllSingletons(this),
      provider: ValueProvider | undefined = singletons.find((x: any) => {
        return x.provide === item
      }) as any
    return provider?.useValue
  }
}

/**
 * @public
 * @param options
 */
export function createContainer(options?: ModuleContainerOptions): ModuleContainer {
  return new ModuleContainer(options)
}

export interface ForwardRefFn {
  (): any
}

export function forTest(opts: DependencyProvider): DependencyProvider | undefined {
  if (isTestEnv()) {
    return opts
  }
  return undefined
}

function uniqProviders(...providers: Iterable<Provider>[]): Provider[] {
  const tokens = new Set<Provider>(),
    uniq: Provider[] = []
  for (const list of providers) {
    for (const provider of list) {
      if (!tokens.has('provide' in provider ? provider.provide : provider)) {
        tokens.add('provide' in provider ? provider.provide : provider)
        uniq.push(provider)
      }
    }
  }
  return uniq
}
