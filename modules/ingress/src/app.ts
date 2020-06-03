import { Container, DependencyCollector } from '@ingress/di'
import { TypeConverter } from './router/type-converter'
import { RouterAddon, Type } from './router/router'
import { BaseContext, DefaultContext, BaseAuthContext } from './context'
import { DefaultMiddleware } from './default.middleware'
import { Ingress, Addon } from './ingress'
import { ControllerDependencyCollector } from './router/controller-annotation'
import { Func } from './lang'

/**
 * @public
 */
export { Container } from '@ingress/di'

/**
 * @public
 */
export class Context extends BaseContext<Context, BaseAuthContext> {}

/**
 * @public
 */
export type IngressConfiguration<T> = {
  preRoute?: Addon<T>
  contextToken?: any
  onError?: (context: T) => Promise<any>
  router?: { routes?: Type<any>[]; baseUrl?: string; typeConverters?: TypeConverter<any>[] }
}

export type IngressOptions<T> =
  | (Type<any> & IngressConfiguration<T>)
  | (Type<any> | IngressConfiguration<T>)
  | Type<any>[]

export function usableForwardRef(ref: Func | Type<any>): any {
  return {
    start(app: { container: Container }): Promise<any> {
      return Promise.resolve((app.container.get(ref) as any).start(app))
    },
    stop(app: { container: Container }): Promise<any> {
      return Promise.resolve((app.container.get(ref) as any).stop(app))
    },
  }
}

/**
 * @public
 */
export default function ingress<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
>(options: IngressOptions<T> = {}): IngressApp<T, A> {
  const server = new Ingress<T, A>(),
    preRoute = 'preRoute' in options ? options.preRoute : null,
    onError = 'onError' in options && options.onError ? { onError: options.onError } : undefined,
    defaultMiddleware = new DefaultMiddleware(onError),
    contextToken = 'contextToken' in options ? options.contextToken : Context,
    container = new Container({ contextToken }),
    baseUrl = ('router' in options && options.router?.baseUrl) || '/',
    router = new RouterAddon<T>({ baseUrl }),
    collect = router.controllerCollector.collect

  if (typeof options === 'function') {
    collect(options)
  }
  if (Array.isArray(options)) {
    options.forEach(collect)
  }
  if ('router' in options) {
    ;(options.router?.routes ?? []).forEach(collect)
  }

  server
    .use(defaultMiddleware)
    .use({
      //Register Collected Routes with DI
      start() {
        container.services.push(...router.controllerCollector.items)
      },
    })
    .use(container)

  preRoute && server.use(preRoute)
  server.use(router)

  return Object.assign(server as any, {
    container: container as Container,
    router,
    Controller: router.Controller,
    Service: container.Service,
    SingletonService: container.SingletonService,
  })
}

export type IngressApp<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
> = Ingress & {
  router: RouterAddon<T>
  container: Container
  Controller: ControllerDependencyCollector
  Service: DependencyCollector
  SingletonService: DependencyCollector
}
