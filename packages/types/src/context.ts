import type { Func, Ingress, ModuleContainerContext } from '@ingress/core'
import type { Readable } from 'node:stream'
import type { Blob } from 'node:buffer'

export type Serializer = Func

export interface Request<T, Body = unknown> {
  context: T
  id: string
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
  blob(): Promise<Blob>
  parse(options: { mode: 'string' } & ParseOptions): Promise<string>
  parse(options: { mode: 'buffer' } & ParseOptions): Promise<Buffer>
  parse<T = any>(options: { mode: 'json' } & ParseOptions): Promise<T>
  parse(options: { mode: 'stream' } & ParseOptions): Readable
  pathname: string
  method: string
  search: string
  headers: Record<string, string | string[] | undefined>
  searchParams: URLSearchParams
  body: Body | string | ArrayBuffer | Blob | null
  rawBody: any
}

export interface ResponseBase<T> extends PromiseLike<void> {
  send(data?: any): this
  readonly headers: Record<string, string | string[] | undefined>
  header(name: string, value: string | number): this
  readonly statusCode: number
  code(code: number): this
  serializers: Record<string, Serializer | null | undefined>
  context: T
}

export type Response<T> = ResponseBase<T> & ResponseBase<T>['send']

/**
 * The Http "Driver" Context.
 * Can be used by varying protocol drivers
 * Eg, http1,2,3 websockets etc.
 *
 * A "Driver" is responsible for invoking the application's middleware (acting as its main event source)
 */
export interface HttpContext<T> extends ModuleContainerContext {
  request: Request<T>
  //response alias
  send: Response<T>
  app: Ingress<HttpContext<T>>
}

export type ParseOptions = {
  sizeLimit?: number
  deserializer?: <T>(body: string) => T | Promise<T>
}

export type ParseMode = 'string' | 'stream' | 'buffer' | 'json'