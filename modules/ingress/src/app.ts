import { Container } from '@ingress/di'
import { TypeConverter } from './router/type-converter'
import { RouterAddon, Type } from './router/router'
import { BaseContext, DefaultContext, BaseAuthContext } from './context'
import { DefaultMiddleware } from './default.middleware'
import { Ingress, Addon } from './ingress'

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

/**
 * @public
 */
export default function ingress<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
>(options: IngressOptions<T> = {}) {
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

  return Object.assign(server, {
    container,
    router,
    Controller: router.Controller,
    Service: container.Service,
    SingletonService: container.SingletonService,
  })
}
