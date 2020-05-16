import { Container } from '@ingress/di'
import { TypeConverter } from './router/type-converter'
import { RouterAddon, Type } from './router/router'
import { BaseContext, DefaultContext, BaseAuthContext } from './context'
import { DefaultMiddleware } from './default.middleware'
import { Ingress, Addon } from './ingress'

/**
 * @public
 */
export type AuthContextFactory<
  T extends BaseContext<T, A> = BaseContext<any, any>,
  A extends BaseAuthContext = BaseAuthContext
> = (options: T) => Promise<A> | A

/**
 * @public
 */
export class Context extends BaseContext<Context, BaseAuthContext> {}

/**
 * @public
 */
export type IngressApp = ReturnType<typeof ingress>

/**
 * @public
 */
export default function ingress<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
>({
  preRoute,
  authContextFactory: authenticator,
  onError,
  contextToken,
  router,
}: {
  preRoute?: Addon<T>
  authContextFactory?: AuthContextFactory
  contextToken?: any
  onError?: (context: T) => Promise<any>
  router?: { routes?: Type<any>[]; baseUrl?: string; typeConverters?: TypeConverter<any>[] }
} = {}) {
  const controllers = router?.routes ?? [],
    routeRoot = router?.baseUrl ?? '/',
    defaultMiddleware = onError ? new DefaultMiddleware<T, A>({ onError }) : new DefaultMiddleware<T, A>(),
    server = new Ingress<T, A>(),
    authContextFactory = authenticator || (() => ({ authenticated: false })),
    container = new Container({ contextToken: contextToken || Context }),
    routerAddon = new RouterAddon<T>({ controllers, typeConverters: router?.typeConverters ?? [], baseUrl: routeRoot })

  server
    .use(defaultMiddleware)
    .use({
      //Copy routes from router, and register them with the DI container
      start() {
        container.serviceCollector.items.push(...routerAddon.controllerCollector.items)
      },
    })
    .use(container)
    .use(async (context, next) => {
      context.authContext = (await authContextFactory(context)) as A
      return next()
    })

  preRoute && server.use(preRoute)
  server.use(routerAddon)

  return Object.assign(server, {
    container,
    router,
    Controller: routerAddon.Controller,
    Service: container.Service,
    SingletonService: container.SingletonService,
  })
}
