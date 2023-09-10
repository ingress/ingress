import 'reflect-metadata'
import type { Injector, Type } from '@ingress/core'
import { isClass, Ingress, NextFn, forwardRef, forTest, ContextToken } from '@ingress/core'
import type { HttpContext, HttpOptions } from '@ingress/http'
import { Http } from '@ingress/http'
import type { ParseOptions, RouteData, RouterContext } from '@ingress/router'
import { Route, Router, routeArgumentParserRegistry } from '@ingress/router'
import { pick } from './lang.js'
//required for typescript inferrence...
import type { Annotation } from 'reflect-annotations'
import type { IngressRequest, IngressResponse } from '@ingress/http'
import { Readable } from 'stream'

export {
  Ingress,
  Router,
  Http,
  Route,
  NextFn,
  forwardRef,
  forTest,
  ContextToken,
  routeArgumentParserRegistry,
}
export default ingress

type Prettify<T> = {
  [K in keyof T]: T[K]
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {}

const identity = <T>(x: T) => x

export type IngressOpts =
  | Prettify<({ routes?: Type<any>[] } & Partial<HttpOptions>) | Type<any>[]>
  | Type<any>

export class Context implements HttpContext<any>, RouterContext {
  static pick = identity
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
