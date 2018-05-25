import {
  ReflectiveInjector,
  Injector,
  InjectionToken,
  Provider,
  ResolvedReflectiveProvider,
  ResolvedReflectiveFactory,
  ReflectiveKey
} from 'injection-js'

import { Type, DependencyCollectorList, DependencyCollector } from './collector'

export * from './collector'
export { ReflectiveInjector, Injector, Provider }

export interface ContainerContext {
  scope: Injector
}

export interface ContainerOptions {
  contextToken?: Object
  providers?: Provider[]
  perRequestProviders?: Provider[]
}

const EMPTY_DEPS: Array<any> = [],
  ContextToken = new InjectionToken('ingress.context')

export class Container<T extends ContainerContext = ContainerContext> implements Injector {
  private rootInjector: ReflectiveInjector | undefined
  private resolvedChildProviders: ResolvedReflectiveProvider[] = []
  private ResolvedContextProvider: Type<ResolvedReflectiveProvider>

  private _singletonCollector = new DependencyCollectorList()
  private _perRequestCollector = new DependencyCollectorList()

  public providers: Provider[] = []
  public perRequestProviders: Provider[] = []
  public Singleton = this._singletonCollector.collect
  public PerRequestLifetime = this._perRequestCollector.collect

  constructor({
    providers = [],
    perRequestProviders = [],
    contextToken = ContextToken
  }: ContainerOptions = {}) {
    Object.assign(this, { providers, perRequestProviders })
    const key = ReflectiveKey.get(contextToken)
    this.ResolvedContextProvider = class<T> implements ResolvedReflectiveProvider {
      public key = key
      public resolvedFactories: ResolvedReflectiveFactory[]
      public multiProvider: boolean = false
      constructor(value: T) {
        this.resolvedFactories = [
          {
            factory() {
              return value
            },
            dependencies: EMPTY_DEPS
          }
        ]
      }
      get resolvedFactory() {
        return this.resolvedFactories[0]
      }
    }
  }

  get(token: any, notFoundValue?: any) {
    return this.rootInjector!.get(token, notFoundValue)
  }

  createChild(...providers: Array<ResolvedReflectiveProvider>) {
    return this.rootInjector!.createChildFromResolved(this.resolvedChildProviders.concat(providers))
  }

  private _initialize() {
    this.providers = this.providers.concat(this._singletonCollector.items)
    this.perRequestProviders = this.perRequestProviders.concat(this._perRequestCollector.items)

    this.rootInjector = ReflectiveInjector.resolveAndCreate(this.providers)
    this.resolvedChildProviders = ReflectiveInjector.resolve(this.perRequestProviders)
  }

  get middleware() {
    this._initialize()
    return (context: T, next: () => any) => {
      context.scope = this.createChild(new this.ResolvedContextProvider(context))
      return next()
    }
  }
}

export default function createContainer(options: ContainerOptions) {
  return new Container(options)
}
