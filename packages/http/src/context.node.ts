import type { IncomingMessage, ServerResponse } from 'http'
import { Logger } from '@ingress/core'
import type { Ingress, Injector } from '@ingress/core'
import { StatusCode } from '@ingress/types'
import { parse } from 'secure-json-parse'
import { parseBuffer, parseString } from './parser.js'
import { finished } from 'readable-stream'
import { Readable } from 'node:stream'
import { Buffer, Blob } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import {
  exists,
  getContentType,
  readUrl,
  isObjectLike,
  hasLength,
  isStream,
  isSerializableError,
  isError,
  isResponse,
} from './util.js'
import type {
  HttpContext,
  IngressRequest,
  IngressResponse,
  ParseMode,
  ParseOptions,
} from './http.context.js'
import type { Http } from './node.http.js'
import { ING_UNHANDLED_INTERNAL_SERVER_ERROR } from '@ingress/types'

const enum SendingState {
  New,
  Sending,
  Sent,
  Erroring,
  Errored,
}

export class NodeRequest<T extends HttpContext<T>> implements IngressRequest<T> {
  public pathname: string
  public method: string
  public search = ''
  public body: any
  public rawBody: Readable
  public protocol: 'http://' | 'https://' = 'http://'
  get headers(): Record<string, string | string[] | undefined> {
    return this.raw.headers
  }
  #searchParams: URLSearchParams | null = null
  get searchParams(): URLSearchParams {
    return (this.#searchParams ||= new URLSearchParams(this.search))
  }

  constructor(public raw: IncomingMessage, public context: T) {
    this.id = '' + (raw as any).id || randomUUID()
    ;[this.pathname, this.search] = readUrl(raw.url ?? '/')
    this.method = raw.method ?? 'GET'
    this.rawBody = raw as Readable
    if ((raw.socket as any)?.encrypted) {
      this.protocol = 'https://'
    }
  }
  public id: string
  public json<J = unknown>(): Promise<J> {
    return this.parse<J>({ mode: 'json' })
  }
  public text(): Promise<string> {
    return this.parse({ mode: 'string' })
  }
  public arrayBuffer(): Promise<ArrayBuffer> {
    return this.parse({ mode: 'buffer' }).then((x) => x.buffer)
  }
  public blob(): Promise<Blob> {
    return this.parse({ mode: 'buffer' }).then((x) => new Blob([x]))
  }
  parse(options: { mode: 'string' } & ParseOptions): Promise<string>
  parse(options: { mode: 'buffer' } & ParseOptions): Promise<Buffer>
  parse<T = any>(options: { mode: 'json' } & ParseOptions): Promise<T>
  parse(options: { mode: 'stream' } & ParseOptions): Readable
  public parse<T = any>(
    options: { mode: ParseMode } & ParseOptions
  ): Promise<string | Buffer | T> | Readable {
    const req = this.raw as any as IncomingMessage,
      limit = 'sizeLimit' in options ? Number(options.sizeLimit) : DefaultParseOptions.sizeLimit
    if (options.mode === 'stream') {
      //SOMEDAY Handle limit
      return req
    }
    if (options.mode === 'json') {
      return parseString<T>(req, limit, options.deserializer || parse)
    }
    if (options.mode === 'string') {
      return parseString(req, limit)
    }
    return parseBuffer(req, limit)
  }
  toRequest(): Request {
    const protocol = this.protocol,
      headers: [string, string][] = []
    for (const [key, value] of Object.entries(this.headers)) {
      if (key && value) {
        headers.push([key, Array.isArray(value) ? value.join(',') : value])
      }
    }
    const method = this.method,
      body = method === 'GET' || method === 'HEAD' ? undefined : this.rawBody,
      url = protocol + this.headers['host'] + this.pathname + this.search
    return new Request(url, {
      body: body as any,
      method,
      headers,
    })
  }
}

class NodeResponse<T extends HttpContext<any>> implements IngressResponse<T> {
  #state = SendingState.New
  #headers: Record<string, string | undefined> = {}
  public serializers = {
    json: (x: any) => JSON.stringify(x),
  }
  constructor(public raw: ServerResponse, public context: T) {
    this.send = this.send.bind(this)
  }
  get statusCode() {
    return this.raw.statusCode
  }
  code(code: number) {
    if (!(code in StatusCode)) {
      throw new TypeError(`Status ${code} is not a valid status code`)
    }
    this.raw.statusCode = code
    this.raw.statusMessage = StatusCode[code] as string
    return this
  }
  send(data: any): this {
    if (this.#state !== SendingState.New) {
      return this
    }
    this.#state = SendingState.Sending

    if (isSerializableError(data)) {
      this.raw.statusCode = data.statusCode || 500
      this.raw.statusMessage =
        data.statusMessage || StatusCode[this.raw.statusCode] || StatusCode[500]
      const message = data.toString()
      this.raw.setHeader('content-type', data.contentType || 'text/plain;charset=UTF-8')
      this.raw.setHeader('content-length', Buffer.byteLength(message).toString())
      this.raw.end(message)
      return this
    }
    if (isError(data)) {
      this.context.scope.get(Logger).error('[ingress]:INTERNAL_SERVER_ERROR', data)
      this.code(500)
      this.raw.end()
    } else if (isResponse(data)) {
      data.headers.forEach((value, key) => {
        this.raw.setHeader(key, value)
      })
      const body = data.body as any
      if (isObjectLike(body) && typeof body.pipeTo === 'function') {
        Readable.fromWeb(body as any).pipe(this.raw)
      }
      this.#state = SendingState.Sent
    } else {
      const [content, type] = this.serializer(this.#headers['content-type'], data)
      for (const header of Object.entries(this.#headers)) {
        this.raw.setHeader(header[0], header[1] as string)
      }
      if (exists(type)) this.raw.setHeader('content-type', type)
      if (hasLength(content)) this.raw.setHeader('content-length', String(content.length))
      if (isStream(content)) {
        content.pipe(this.raw)
      } else {
        this.raw.end(content)
      }
    }
    this.#state = SendingState.Sent
    return this
  }
  serializer(contentType: string | null | undefined, data: any) {
    const hasContentType = exists(contentType)
    if (!hasContentType && exists(data)) {
      contentType = getContentType(data)
    }
    if (contentType && contentType.indexOf('json') > -1) {
      return [this.serializers.json(data), contentType] as const
    }
    return [data, exists(data) && exists(contentType) ? contentType : undefined] as const
  }

  get headers() {
    return this.#headers
  }
  header(name: string, value: string | number) {
    this.#headers[name.trim().toLowerCase()] = value.toString()
    return this
  }
  then<TResult1 = void, TResult2 = never>(
    onSent?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onFailed?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    finished(this.raw, (err) => {
      this.context
      if (err) {
        if (onFailed) onFailed(err)
      } else if (onSent) {
        onSent()
      }
    })
    return this as any
  }
}
/**
 * HttpContext is a "Driver" context and assumes all the properties added by middleware.
 *
 **/
export class NodeHttpContext<T extends HttpContext<any>> implements HttpContext<T> {
  public scope: Injector = null as any
  public http = this
  public request: IngressRequest<T>
  public response: IngressResponse<T>
  constructor(
    public req: IncomingMessage,
    public res: ServerResponse,
    public app: Ingress<T, { http: Http }>
  ) {
    this.request = new NodeRequest<T>(req, this as unknown as T)
    this.response = new NodeResponse<T>(res, this as unknown as T)
  }
}

const DefaultParseOptions = {
  sizeLimit: 1.5e7,
}
