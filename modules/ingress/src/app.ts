import { Container, DependencyCollector } from '@ingress/di'
import { TypeConverter } from './router/type-converter'
import { Router, Type } from './router/router'
import { Websockets } from './websocket/upgrade'
import { BaseContext, DefaultContext, BaseAuthContext, Middleware } from './context'
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
  preUpgrade?: Middleware<T>
  preRoute?: Addon<T>
  contextToken?: any
  onError?: (context: T) => Promise<any>
  router?: { routes?: Type<any>[]; baseUrl?: string; typeConverters?: TypeConverter<any>[] }
}

export type IngressOptions<T> =
  | (Type<any> & IngressConfiguration<T>)
  | (Type<any> | IngressConfiguration<T>)
  | Type<any>[]

/**
 * @public
 * A wrapper to bind a singleton dependency that has not been created yet, to the lifecycle of the application.
 * This method implies that the reference to an instance to be used is not yet available but will be available via the container at runtime.
 *
 * For example, database or cache connection management that has setup/teardown and middleware that manages transaction or inflight requests.
 * This pattern avoids the need to "new" up and "initialize" a dependency at app start time and instead lets the IoC Container handle it.
 */
export function usableForwardRef(ref: Type<any>): any {
  let middlewareRef: null | Middleware<any> | false = null
  return {
    get middleware() {
      return (context: DefaultContext, next: Func<Promise<void>>) => {
        if (middlewareRef === false) {
          return next()
        }
        if (!middlewareRef) {
          middlewareRef = context.scope.get(ref).middleware
        }
        if (middlewareRef) {
          return middlewareRef(context, next)
        }
        middlewareRef = false
        return next()
      }
    },
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
    preUpgrade: Middleware<any> =
      'preUpgrade' in options ? (options.preUpgrade as Middleware<any>) : (_, next) => next(),
    onError = 'onError' in options && options.onError ? { onError: options.onError } : undefined,
    defaultMiddleware = new DefaultMiddleware(onError),
    contextToken = 'contextToken' in options ? options.contextToken : Context,
    container = new Container({ contextToken }),
    baseUrl = ('router' in options && options.router?.baseUrl) || '/',
    router = new Router<T>({ baseUrl }),
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
      //register collected routes as services just in time
      start() {
        container.services.push(...router.controllerCollector.items)
      },
    })
    .use(container)

  preRoute && server.use(preRoute)
  server.use(router)
  server.use(new Websockets(preUpgrade, router, container))

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
  router: Router<T>
  container: Container
  Controller: ControllerDependencyCollector
  Service: DependencyCollector
  SingletonService: DependencyCollector
}
