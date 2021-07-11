/* istanbul ignore file */
import { Readable } from 'stream'
import type { Type } from './annotations/controller.annotation.js'

export function mockContext(
  url: string,
  method: string,
  opts?: Record<string, any>,
  ...deps: Type<any>[]
): any {
  const data = opts?.body || {},
    params = opts?.params || [],
    searchParams = opts?.searchParams || new URLSearchParams(url.split('?')[1] ?? ''),
    headers = opts?.headers || {},
    ctx = {
      req: Object.assign(stream(data), { url, method, headers }),
      res: { statusCode: 0 },
      scope: mockContainer(deps),
      parse() {
        return Promise.resolve(data)
      },
      route: {
        searchParams,
        params,
        body: data,
      },
    }
  if (opts?.overrides) {
    Object.assign(ctx, opts.overrides)
  }
  return ctx
}
function stream<T>(data: T | null = null) {
  return new Readable({
    read() {
      this.push(data)
      if (data) this.push(null)
    },
  })
}

function mockContainer(deps: Type<any>[]) {
  const result = new Map<any, any>()
  for (const dep of deps) {
    result.set(dep, new dep())
  }
  return result
}
