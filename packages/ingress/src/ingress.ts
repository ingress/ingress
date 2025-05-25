import 'reflect-metadata'
import type { Injector, Type } from '@ingress/core'
import { isClass, Ingress, NextFn, forwardRef, forTest, ContextToken } from '@ingress/core'
import type { HttpContext, HttpOptions } from '@ingress/http'
import { Http } from '@ingress/http'
import type { RouteData, RouterContext } from '@ingress/router'
import { ControllerCollector, Route, Router } from '@ingress/router'
import { pick } from './lang.js'
import type { IngressRequest, IngressResponse } from '@ingress/http'
import { DependencyCollectorList } from '@ingress/core'

export { Ingress, Router, Http, Route, NextFn, forwardRef, forTest, ContextToken }
export default ingress

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type IngressOpts =
  | Prettify<({ routes?: Type<any>[] } & Partial<HttpOptions>) | Type<any>[]>
  | Type<any>

export class Context implements HttpContext<any>, RouterContext {
  request!: IngressRequest<any, unknown>
  response!: IngressResponse<any>
  app!: Ingress<any, { http: Http; router: Router }>
  scope!: Injector
  route!: RouteData | null
}

export function ingress(opts?: IngressOpts) {
  let routes: Type<any>[] | undefined = undefined,
    options: Partial<HttpOptions> | undefined = undefined
  if (isClass(opts) || Array.isArray(opts)) {
    routes = isClass(opts) ? [opts] : opts
  } else if (opts && !isClass(opts)) {
    routes = pick(opts, 'routes')?.routes
    options = pick(opts, 'listen', 'clientErrorHandler')
  }

  const router = new Router({ routes }),
    http = new Http(options),
    core = new Ingress({ context: Context }),
    app = core.use(http).use(router),
    result = Object.assign(app, {
      router,
      http,
      Route,
      Routes: router.Controller,
      Service: app.container.Service,
      Singleton: app.container.SingletonService,
      UseSingleton: app.container.UseSingleton,
    })

  return result as Prettify<typeof result>
}

// Global Collectors
const collectors = {
  Routes: new ControllerCollector(),
  Service: new DependencyCollectorList(),
  Singleton: new DependencyCollectorList(),
  UseSingleton: new DependencyCollectorList(),
} as const

export const Routes = collectors.Routes.collect
/**
 * alias for Routes
 */
export const Controller = Routes
export const Service = collectors.Service.collect
export const Singleton = collectors.Singleton.collect
export const UseSingleton = collectors.UseSingleton.collect

export function fromGlobalContext() {
  const app = ingress()
  let maxItems = 0

  const collected = Array.from(Object.entries(collectors), ([name, c]) => {
    if (c.items.size > maxItems) maxItems = c.items.size
    if (c.items.size > 0) return [name as keyof typeof collectors, c.items.values()] as const
  })
  for (let i = 0; i < maxItems; i++) {
    for (let j = 0; j < collected.length; j++) {
      const item = collected[j]?.[1]?.next().value
      if (!item) continue
      app[collected[j]![0]]?.(item)
    }
  }
  return app
}
