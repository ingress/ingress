import { Ingress, Middleware } from '@ingress/core'
import type { AddressInfo } from 'node:net'
import { Http } from './node.http'
import { fetch } from 'undici'

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
export type Started = Awaited<ReturnType<typeof start>>

export async function start(
  httpArgs?: ConstructorParameters<typeof Http>,
  ...mw: Middleware<any>[]
) {
  const http = httpArgs ? new Http(httpArgs as any) : new Http(),
    app = new Ingress().use(http)
  mw.forEach((x) => app.use(x))
  await app.run()
  const address = http.server.address() as AddressInfo
  return {
    app,
    address,
    request: async function (path = '/' + Math.random()) {
      const res = await fetch(`http://localhost:${address.port}` + path),
        text = await res.text()
      return Object.assign(res, { payload: text })
    },
  }
}
