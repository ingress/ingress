import type { Func, Ingress, CoreContext } from '@ingress/core'
import type { Readable } from 'node:stream'
import type { Blob } from 'node:buffer'
import type { Http } from './node.http'

export type Serializer = Func

export interface IngressRequest<T, Body = unknown> {
  context: T
  id: string
  toRequest(): Request
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
  blob(): Promise<Blob>
  parse(options: { mode: 'string' } & ParseOptions): Promise<string>
  parse(options: { mode: 'buffer' } & ParseOptions): Promise<Buffer>
  parse<T = any>(options: { mode: 'json' } & ParseOptions): Promise<T>
  parse(options: { mode: 'stream' } & ParseOptions): Readable
  protocol: 'http://' | 'https://'
  pathname: string
  method: string
  search: string
  headers: Record<string, string | string[] | undefined>
  searchParams: URLSearchParams
  body: Body | string | ArrayBuffer | Blob | null
  rawBody: any
}

export interface IngressResponse<T> extends PromiseLike<void> {
  send(data?: any): this
  readonly headers: Record<string, string | string[] | undefined>
  header(name: string, value: string | number): this
  readonly statusCode: number
  code(code: number): this
  serializers: Record<string, Serializer | null | undefined>
  context: T
}

/**
 * The Http "Driver" Context.
 * Can be used by varying protocol drivers
 * Eg, http1,2,3 websockets etc.
 *
 * A "Driver" is responsible for invoking the application's middleware (acting as its main event source)
 */
export interface HttpContext<T extends CoreContext> extends CoreContext {
  request: IngressRequest<T>
  response: IngressResponse<T>
  app: Ingress<T, { http: Http }>
}

export type ParseOptions = {
  sizeLimit?: number
  deserializer?: <T>(body: string) => T | Promise<T>
}

export type ParseMode = 'string' | 'stream' | 'buffer' | 'json'
