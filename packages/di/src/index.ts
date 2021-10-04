import {
  ReflectiveInjector,
  Injector,
  Injectable,
  InjectionToken,
  Provider,
  ResolvedReflectiveProvider,
  ResolvedReflectiveFactory,
  ReflectiveKey,
} from 'injection-js'

import { Type, DependencyCollectorList, DependencyCollector, Func } from './collector.js'

export * from './collector.js'
export { ReflectiveInjector, Injector, Provider, Injectable }

/**
 * @public
 */
export interface ContainerContext {
  scope: Injector
}

/**
 * @public
 */
export interface ContainerOptions {
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
export class Container implements Injector {
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
  }: ContainerOptions = {}) {
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

  public registerSingletonProvider(...providers: Provider[]) {
    if (this.rootInjector) {
      throw new Error('Cannot register provider on existing container')
    }
    this.singletons.push(...providers)
  }

  public registerProvider(...providers: Provider[]) {
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
    this.singletons = [
      ...new Set([
        ...this.singletons,
        ...this.singletonCollector.items,
        ...this.forwardRefCollector.items,
      ]),
    ]
    this.services = [...new Set([...this.services, ...this.serviceCollector.items])]
    this.rootInjector = ReflectiveInjector.resolveAndCreate(this.singletons)
    this.resolvedChildProviders = ReflectiveInjector.resolve(this.services)
    //forward any "collected" forwardRefs
    for (const forward of this.forwardRefCollector.items) {
      app.use(this.get(forward))
    }
  }

  initContext(ctx: any): any {
    ctx.scope = null as any
    return ctx
  }

  get middleware() {
    return (context: { scope: Injector }, next: () => any): Promise<any> => {
      context.scope = this.createChildWithContext(context)
      return next()
    }
  }
}

/**
 * @public
 * @param options
 */
export default function createContainer(options: ContainerOptions): Container {
  return new Container(options)
}

export { createContainer }
