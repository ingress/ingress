import 'reflect-metadata'
import type { Type } from '@ingress/core'
import { Ingress, NextFn, forwardRef, forTest } from '@ingress/core'
import type { HttpOptions } from '@ingress/http'
import { Http } from '@ingress/http'
import { Route, Router } from '@ingress/router'
import { pick, isClass } from './lang.js'
//required for typescript inferrence...
import type { Annotation } from 'reflect-annotations'

export { Ingress, Router, Http, Route, NextFn, forwardRef, forTest }
export default ingress

type Prettify<T> = {
  [K in keyof T]: T[K]
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {}

export type IngressOpts =
  | Prettify<({ routes?: Type<any>[] } & Partial<HttpOptions>) | Type<any>[]>
  | Type<any>

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
    core = new Ingress(),
    app = core.use(http).use(router),
    result = Object.assign(app, {
      http,
      router,
      Route,
      Routes: router.Controller,
      Service: app.container.Service,
      Singleton: app.container.SingletonService,
      UseSingleton: app.container.UseSingleton,
    })

  return result as Prettify<typeof result>
}
