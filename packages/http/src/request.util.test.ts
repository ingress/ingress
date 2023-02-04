import 'reflect-metadata'
import { inject } from '@hapi/shot'
import { Http, HttpContext } from './node.http'
import { Ingress, Middleware } from '@ingress/core'

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
export type Started = Awaited<ReturnType<typeof start>>

export async function start(
  httpArgs?: ConstructorParameters<typeof Http>,
  ...mw: Middleware<any>[]
) {
  const http = httpArgs ? new Http(httpArgs as any) : new Http(),
    app = new Ingress<HttpContext<any>>().use(http)
  mw.forEach((m) => app.use(m))
  await app.start()
  return {
    app,
    request: async function (path = '/' + Math.random()) {
      const response = await inject(app.driver, {
        url: path,
      })
      return response
    },
  }
}
