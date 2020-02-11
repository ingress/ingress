import {
  ReflectiveInjector,
  Injector,
  Injectable,
  InjectionToken,
  Provider,
  ResolvedReflectiveProvider,
  ResolvedReflectiveFactory,
  ReflectiveKey
} from "injection-js";

import {
  Type,
  DependencyCollectorList,
  DependencyCollector
} from "./collector";

export * from "./collector";
export { ReflectiveInjector, Injector, Provider, Injectable };

export interface ContainerContext {
  scope: Injector;
}

export interface ContainerOptions {
  contextToken?: Object;
  singletons?: Provider[];
  services?: Provider[];
}

const EMPTY_DEPS: Array<any> = [],
  ContextToken = new InjectionToken("ingress.context") as any;

export { ContextToken };

export class Container<T extends ContainerContext = ContainerContext>
  implements Injector {
  private rootInjector: ReflectiveInjector | undefined;
  private resolvedChildProviders: ResolvedReflectiveProvider[] = [];
  private ResolvedContextProvider: Type<ResolvedReflectiveProvider>;

  public singletonCollector = new DependencyCollectorList();
  public serviceCollector = new DependencyCollectorList();
  public ContextToken = ContextToken;
  public singletons: Provider[] = [];
  public services: Provider[] = [];

  get SingletonService() {
    return this.singletonCollector.collect;
  }
  get Service() {
    return this.serviceCollector.collect;
  }

  constructor({
    singletons = [],
    services = [],
    contextToken = ContextToken
  }: ContainerOptions = {}) {
    Object.assign(this, { singletons, services });
    const key = ReflectiveKey.get(contextToken);
    this.ResolvedContextProvider = class<T>
      implements ResolvedReflectiveProvider {
      public key = key;
      public resolvedFactories: ResolvedReflectiveFactory[];
      public multiProvider: boolean = false;
      constructor(value: T) {
        this.resolvedFactories = [
          {
            factory() {
              return value;
            },
            dependencies: EMPTY_DEPS
          }
        ];
      }
      get resolvedFactory() {
        return this.resolvedFactories[0];
      }
    };
  }
  get<T>(token: any, notFoundValue?: any): T;
  get<T>(token: T, notFoundValue?: any): T {
    return this.rootInjector!.get(token, notFoundValue);
  }

  createChild(...providers: Array<ResolvedReflectiveProvider>) {
    return this.rootInjector!.createChildFromResolved(
      this.resolvedChildProviders.concat(providers)
    );
  }

  public resolveProviders() {
    this.start();
  }

  public start() {
    this.singletons = this.singletons.concat(this.singletonCollector.items);
    this.services = this.services.concat(this.serviceCollector.items);

    this.rootInjector = ReflectiveInjector.resolveAndCreate(this.singletons);
    this.resolvedChildProviders = ReflectiveInjector.resolve(this.services);
  }
  get middleware() {
    return (context: T, next: () => any) => {
      context.scope = this.createChild(
        new this.ResolvedContextProvider(context)
      );
      return next();
    };
  }
}

export default function createContainer(options: ContainerOptions) {
  return new Container(options);
}
