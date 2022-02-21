import {
  ReflectiveInjector,
  InjectionToken,
  Provider,
  ResolvedReflectiveProvider,
  ResolvedReflectiveFactory,
  ReflectiveKey,
  ValueProvider,
} from 'injection-js'

import { Type, DependencyCollectorList, DependencyCollector, Func } from './collector.js'

export * from './collector.js'
export { Provider, Injectable } from 'injection-js'

export interface Injector {
  get<T>(token: Type<T> | InjectionToken<T>, notFoundValue?: T): T
}

/**
 * @public
 */
export interface ModuleContainerContext {
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
export class ModuleContainer implements Injector {
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
      public key = key
      public resolvedFactories: ResolvedReflectiveFactory[]
      public multiProvider = false
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

  public async start(app: any, next: Func<Promise<any>>): Promise<any> {
    if (next) {
      await next()
    }
    if (app && app.container) {
      app.container.initWith(this)
    } else {
      this.initWith()
    }
    for (const forward of this.forwardRefCollector.items) {
      app.use(this.get(forward))
    }
  }

  public initWith(container = this) {
    this.singletons = [
      ...new Set([
        ...this.singletons,
        ...container.singletons,
        ...container.singletonCollector.items,
        ...container.forwardRefCollector.items,
      ]),
    ]
    this.services = [...new Set([...this.services, ...container.serviceCollector.items])]

    this.rootInjector = ReflectiveInjector.resolveAndCreate(this.singletons)
    this.resolvedChildProviders = ReflectiveInjector.resolve(this.services)
  }

  initContext(ctx: any): any {
    ctx.scope ||= null
    return ctx
  }

  get middleware() {
    return (context: { scope: Injector }, next: () => any): Promise<any> => {
      context.scope ||= this.createChildWithContext(context)
      return next()
    }
  }

  public findRegisteredSingleton<T = any>(item: Type<T>): T | undefined {
    if (this.singletonCollector.items.has(item)) {
      return item as any as T
    }
    const provider: ValueProvider | undefined = this.singletons.find((x) => {
      ;('provide' in x && x.provide) === item
    }) as any
    return provider?.useValue
  }
}

/**
 * @public
 * @param options
 */
export default function createModuleContainer(options?: ModuleContainerOptions): ModuleContainer {
  return new ModuleContainer(options)
}

const createContainer = createModuleContainer
export { createModuleContainer, createContainer }
export { ModuleContainer as Container }

export function tokenFor<T>(type: T): Type<T> {
  return type as any as Type<T>
}
