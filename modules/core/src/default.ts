import { CoreContext, Body } from './context'
import { StatusCode } from './status-code'
import { ServerResponse } from 'http'
import { Buffer } from 'buffer'
import { Stream } from 'stream'
import destroy = require('destroy')
import onFinished = require('on-finished')
import { Addon } from './index'

const looksLikeHtmlRE = /^\s*</,
  logError = <T extends CoreContext<T>>(context: T) => {
    console.error(context.error)
  },
  isDefined = (x: any) => x !== null && x !== void 0,
  isString = (str: any): str is string => typeof str === 'string' || str instanceof String,
  isStreamLike = (body: Body): body is Stream =>
    Boolean((body && typeof (body as Stream).pipe === 'function') || body instanceof Stream),
  ensureErrorHandler = (stream: Stream, handler: (error: Error) => any) => {
    stream.listeners('error').indexOf(handler) === -1 && stream.on('error', handler)
  }

export * from './status-code'

export interface DefaultOptions<T> {
  onError(context: T): Promise<any> | any
}

export class DefaultMiddleware<T extends CoreContext<T>> implements Addon<T> {
  private onError: (context: T) => Promise<any> | any

  constructor(options: DefaultOptions<T> = { onError: logError }) {
    this.onError = options.onError
  }

  private _contentLength(res: ServerResponse, length: number) {
    res.setHeader('Content-Length', length.toString())
  }

  private _contentType(res: ServerResponse, value: string) {
    res.setHeader('Content-Type', value)
  }

  private _statusResponse(status: number, message: string, res: ServerResponse, body?: Body) {
    res.statusCode = status || 404
    res.statusMessage = message = message || StatusCode[res.statusCode]
    body = isDefined(body) ? body : message
    this._contentType(res, 'text/plain')
    this._contentLength(res, Buffer.byteLength(body as string))
    res.end(body)
  }

  private _handleResponse(ctx: CoreContext<T>, handleError: (error: Error) => any) {
    const res = <any>ctx.res,
      hasContentType = Boolean(res._headers && res._headers['content-type'])

    let body = ctx.body

    if (res.headersSent || (res.socket && !res.socket.writable)) {
      return
    }

    if (ctx.error) {
      return this._statusResponse((<any>ctx.error).code || 500, res.statusMessage, res, body)
    }

    if (StatusCode.Empty[res.statusCode]) {
      res._headers = {}
      return res.end()
    }

    if (!body) {
      return this._statusResponse(res.statusCode, res.statusMessage, res)
    }

    if (ctx.req.method === 'HEAD') {
      !isString(body) &&
        !Buffer.isBuffer(body) &&
        !isStreamLike(body) &&
        this._contentLength(res, Buffer.byteLength(JSON.stringify(body)))
      return res.end()
    }

    if (isString(body)) {
      !hasContentType &&
        this._contentType(res, 'text/' + (looksLikeHtmlRE.test(body) ? 'html' : 'plain'))
      this._contentLength(res, Buffer.byteLength(body))
      return res.end(body)
    }

    if (Buffer.isBuffer(body)) {
      !hasContentType && this._contentType(res, 'application/octet-stream')
      this._contentLength(res, body.length)
      return res.end(body)
    }

    if (isStreamLike(body)) {
      !hasContentType && this._contentType(res, 'application/octet-stream')
      onFinished(res, () => destroy(body))
      ensureErrorHandler(body as Stream, handleError)
      return (body as Stream).pipe(res)
    }

    body = JSON.stringify(body)
    this._contentType(res, 'application/json')
    this._contentLength(res, Buffer.byteLength(body as string))
    res.end(body)
  }

  get middleware() {
    const onError = this.onError
    return (context: T, next: () => Promise<any>) => {
      const handleError = (error: Error | null) => {
          if (error) {
            context.error = error
            return onError(context)
          }
        },
        handleResponse = () => this._handleResponse(context, handleError)

      context.handleError = handleError
      context.handleResponse = handleResponse
      context.res.statusCode = 404
      onFinished(context.req, handleError)
      return next()
        .catch(handleError)
        .then(handleResponse)
    }
  }
}
