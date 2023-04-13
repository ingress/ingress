import 'reflect-metadata'
import { vi } from 'vitest'
import { inject } from '@hapi/shot'
import type { HttpContext } from './node.http'
import { Http } from './node.http'
import type { Middleware } from '@ingress/core'
import { Ingress, Logger } from '@ingress/core'

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
export type Started = Awaited<ReturnType<typeof start>>

export async function start(
  httpArgs?: ConstructorParameters<typeof Http>,
  ...mw: Middleware<any>[]
) {
  const http = httpArgs ? new Http(httpArgs as any) : new Http(),
    app = new Ingress<HttpContext<any>>().use(http)
  mw.forEach((m) => app.use(m))
  @app.container.SingletonService({
    provide: Logger,
  })
  class TestLogger {
    error = vi.fn()
  }

  await app.start()
  return {
    logger: Logger,
    app,
    request: async function (path = '/' + Math.random()) {
      const response = await inject(app.driver, {
        url: path,
      })
      return response
    },
  }
}
