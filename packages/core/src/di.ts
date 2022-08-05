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
import type { Startable } from './types.js'
/* c8 ignore next */
export * from './collector.js'
export { Provider, Injectable, InjectionToken } from 'injection-js'

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

  public async start(app?: any, next?: Func): Promise<any> {
    if (next) {
      await next()
    }
    //merge into parent container
    if (app && app.container) {
      app.container.setup(this)
      if (app.container !== this) {
        //remove sub-container initializers from the extendContext pipeline.
        app.unUse(this)
      }
    } else {
      this.setup()
    }
    return app?.finalize(this.forwardRefCollector.items)
  }

  public setup(container = this) {
    this.singletons = this.getAllSingletons(container)
    this.services = [...new Set([...this.services, ...container.serviceCollector.items])]

    this.rootInjector = ReflectiveInjector.resolveAndCreate(this.singletons)
    this.resolvedChildProviders = ReflectiveInjector.resolve(this.services)
  }

  private getAllSingletons(container = this) {
    return [
      ...new Set([
        ...this.singletons,
        ...container.singletons,
        ...container.singletonCollector.items,
        ...container.forwardRefCollector.items,
      ]),
    ]
  }

  extendContext(ctx: any): any {
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
