import {
  ReflectiveInjector,
  Injector,
  Provider,
  ResolvedReflectiveProvider,
  ResolvedReflectiveFactory,
  ReflectiveKey
} from 'angular.di'

export {
  ReflectiveInjector,
  Injector,
  Provider
}

export const Type = Function
export interface Type<T> {
  new(...args: any[]): T
}

class Collector {
  public collected: Array<Type<any>> = []
  public collect: ClassDecorator
  constructor () {
    this.collect = (target: Type<any>) => {
      target && this.collected.push(target)
      return target && target || this.collect
    }
  }
}

export interface ContainerOptions {
  contextToken?: Object,
  providers?: Provider[],
  perRequestProviders?: Provider[]
}

const EMPTY_DEPS: Array<any> = [],
  ContextToken = Symbol.for('ingress.context')

export class Container implements Injector {
  private rootInjector: ReflectiveInjector
  private resolvedChildProviders: ResolvedReflectiveProvider[]
  private ResolvedContextProvider: Type<ResolvedReflectiveProvider>

  private _singletonCollector = new Collector()
  private _perRequestCollector = new Collector()

  public providers: Provider []
  public perRequestProviders: Provider []
  public Singleton = this._singletonCollector.collect
  public PerRequestLifetime = this._perRequestCollector.collect

  constructor ({
    providers = [],
    perRequestProviders = [],
    contextToken = ContextToken
  }: ContainerOptions = {}) {
    Object.assign(this, { providers, perRequestProviders })
    const key = ReflectiveKey.get(contextToken)
    this.ResolvedContextProvider = class <T> implements ResolvedReflectiveProvider {
      public key = key
      public resolvedFactories: ResolvedReflectiveFactory[]
      public multiProvider: boolean
      constructor (value: T) {
        this.resolvedFactories = [{
          factory () {
            return value
          },
          dependencies: EMPTY_DEPS
        }]
      }
      get resolvedFactory () {
        return this.resolvedFactories[0]
      }
    }
  }

  get (token: any, notFoundValue?: any) {
    return this.rootInjector.get(token, notFoundValue)
  }

  createChild (...providers: Array<ResolvedReflectiveProvider>) {
    return this.rootInjector.createChildFromResolved(this.resolvedChildProviders.concat(providers))
  }

  private _initialize () {
    this.providers = this.providers.concat(this._singletonCollector.collected)
    this.perRequestProviders = this.perRequestProviders.concat(this._perRequestCollector.collected)

    this.rootInjector = ReflectiveInjector.resolveAndCreate(this.providers)
    this.resolvedChildProviders = ReflectiveInjector.resolve(this.perRequestProviders)
  }

  get middleware () {
    this._initialize()
    return (context: { scope: Injector }, next: () => any) => {
      context.scope = this.createChild(new this.ResolvedContextProvider(context))
      return next()
    }
  }
}

export default function createContainer (options: ContainerOptions) {
  return new Container(options)
}
