import 'reflect-metadata'
import type { Type } from '@ingress/core'
import { Ingress, NextFn, forwardRef } from '@ingress/core'
import type { HttpOptions } from '@ingress/http'
import { Http } from '@ingress/http'
import { Route, Router } from '@ingress/router'
import { pick } from './lang.js'

export { Ingress, Router, Http, Route, NextFn, forwardRef }
export default ingress

type Prettify<T> = {
  [K in keyof T]: T[K]
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {}

export type IngressOpts = Prettify<({ routes?: Type<any>[] } & Partial<HttpOptions>) | Type<any>[]>

export function ingress(opts?: IngressOpts) {
  let routes: Type<any>[] | undefined = undefined,
    options: Partial<HttpOptions> | undefined = undefined
  if (Array.isArray(opts)) {
    routes = opts
  } else {
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
