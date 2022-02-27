import type { IncomingMessage, ServerResponse } from 'http'
import type { Ingress } from '@ingress/core'
import { StatusCode } from '@ingress/types'
import { parse } from 'secure-json-parse'
import { parseBuffer, parseString } from './parser.js'
import { finished, Readable } from 'readable-stream'
import { Buffer, Blob } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import type {
  HttpContext,
  ParseMode,
  ParseOptions,
  Request,
  Response,
  ResponseBase,
} from '@ingress/types'
import { exists, getContentType, readUrl, isObjectLike } from './util.js'
import type { Injector } from 'injection-js'

const DefaultErrorStatusText = 'Internal Server Error'
const enum SendingState {
  New,
  Sending,
  Sent,
  Erroring,
  Errored,
}

export class NodeRequest<T> implements Request<T> {
  public pathname: string
  public method: string
  public search = ''
  public body: any
  public rawBody: Readable
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
  }
  public id: string
  public json<J = unknown>(): Promise<J> {
    return this.parse({ mode: 'json' })
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
      //SOMEDAY? Handle limit?
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
}

class NodeResponseBase<T extends HttpContext<any>> implements ResponseBase<T> {
  #state = SendingState.New
  static create<T>(...args: ConstructorParameters<typeof NodeResponseBase>): Response<T> {
    const base = new NodeResponseBase(...args),
      send = base.send.bind(base)
    Object.setPrototypeOf(send, base)
    return send as any as Response<T>
  }
  public serializers = {
    json: (x: any) => JSON.stringify(x),
  }
  #headers: Record<string, string | undefined> = {}
  constructor(public raw: ServerResponse, public context: T) {}
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
      //TODO determine error state...
      return this
    }
    if (data instanceof Error) {
      const error = data as any
      if (isObjectLike(error) && 'statusCode' in error) {
        this.code(error.statusCode)
        this.raw.statusMessage =
          error.statusText || StatusCode[error.statusCode] || DefaultErrorStatusText
        this.raw.end()
      } else {
        this.code(500)
        this.raw.end()
      }
    } else {
      this.raw.end(this.serializer(this.#headers['content-type'], data))
    }
    this.#state = SendingState.Sent
    return this
  }
  serializer(contentType: string | null | undefined, data: any): string | Buffer {
    const hasContentType = exists(contentType)
    if (!hasContentType && exists(data)) {
      contentType = getContentType(data)
    }
    if (contentType && contentType.indexOf('json') > -1) {
      return this.serializers.json(data)
    }
    return data
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
      if (err) {
        if (onFailed) onFailed(err)
      } else if (onSent) {
        onSent()
      }
    })
    return this as any
  }
}
Object.setPrototypeOf(NodeResponseBase.prototype, Function.prototype)

/**
 * HttpContext is a "Driver" context and assumes all the properties added by middleware.
 *
 * eg. Ingress's built-in DI middleware adds the `scope` child injector property.
 */
export class NodeHttpContext<T> implements HttpContext<T> {
  //core props
  public scope!: Injector
  public http = this
  public request: NodeRequest<T>
  public send: Response<T>
  constructor(public req: IncomingMessage, public res: ServerResponse, public app: Ingress<any>) {
    this.request = new NodeRequest(req, this as unknown as T)
    this.send = NodeResponseBase.create(res, this)
  }
}

const DefaultParseOptions = {
  sizeLimit: 1.5e7,
}
