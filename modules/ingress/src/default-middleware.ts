import { StatusCode } from '@ingress/http-status'
import { ServerResponse } from 'http'
import { Middleware, BaseAuthContext, BaseContext, DefaultContext, Body, Response, Request } from './context'
import { Buffer } from 'buffer'
import { Stream } from 'stream'
import onFinished = require('on-finished')
import destroy = require('destroy')

const internalError = new Error('Internal Server Error')
;(internalError as any).code = 500

const looksLikeHtmlRE = /^\s*</,
  logError = (context: { error?: Error | null }) => {
    console.error('Internal Server Error: ' + context.error)
  },
  isStatusCode = (x: any) => typeof x === 'number' && x <= 500,
  isString = (str: any): str is string => typeof str === 'string' || str instanceof String,
  isStreamLike = (body: Body): body is Stream =>
    Boolean((body && typeof (body as Stream).pipe === 'function') || body instanceof Stream),
  ensureErrorHandler = (stream: Stream, handler: (error: Error) => any) => {
    stream.listeners('error').indexOf(handler) === -1 && stream.on('error', handler)
  },
  isWritable = (res: any) => {
    return !Boolean(res.headersSent || (res.socket && !res.socket.writable))
  },
  clearHeaders = (res: ServerResponse) => {
    res.getHeaderNames().forEach((x: string) => res.removeHeader(x))
  }

export interface DefaultOptions {
  onError<T>(context: T): Promise<any> | any
}

export class DefaultMiddleware<
  T extends BaseContext<T, A> = DefaultContext,
  A extends BaseAuthContext = BaseAuthContext
> {
  public inflight = 0
  private onError: <T>(context: T) => Promise<any> | any

  constructor(options: DefaultOptions = { onError: logError }) {
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
    res.statusMessage = message = message || StatusCode[res.statusCode] || StatusCode[500]
    body = isString(body) ? body : message
    this._contentType(res, 'text/plain')
    this._contentLength(res, Buffer.byteLength(body))
    res.end(body)
  }

  private _handleResponse(ctx: T) {
    const res = ctx.res as any,
      hasContentType = Boolean(res.getHeader('content-type'))

    let body = ctx.body

    if (!isWritable(res)) {
      return
    }

    if (ctx.error) {
      const code = (ctx.error as any).code
      return this._statusResponse(isStatusCode(code) ? code : 500, res.statusMessage, res, body)
    }

    if (res.statusCode in StatusCode.Empty) {
      clearHeaders(res)
      return res.end()
    }

    if (body === null || body === undefined) {
      res.statusCode = res.statusCode || 404
      res.statusMessage = res.statusMessage || StatusCode[res.statusCode] || StatusCode[500]
      return res.end()
    }

    if (ctx.req.method === 'HEAD') {
      !isString(body) &&
        !Buffer.isBuffer(body) &&
        !isStreamLike(body) &&
        this._contentLength(res, Buffer.byteLength(JSON.stringify(body)))
      return res.end()
    }

    if (isString(body)) {
      !hasContentType && this._contentType(res, 'text/' + (looksLikeHtmlRE.test(body) ? 'html' : 'plain'))
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
      ensureErrorHandler(body as Stream, ctx.handleError!)
      return (body as Stream).pipe(res)
    }

    body = JSON.stringify(body)
    this._contentType(res, 'application/json')
    this._contentLength(res, Buffer.byteLength(body as string))
    res.end(body)
  }

  get middleware(): Middleware<T> {
    const onError = this.onError,
      onResEnd = (error: Error | null, res: any) => {
        this.inflight--
        res = res as Response<DefaultContext>
        res.context.emit('response-finished', { error, context: res.context })
      },
      onReqEnd = (error: Error | null, req: any) => {
        req = req as Request<DefaultContext>
        req.context.emit('request-finished', { error, context: req.context })
        if (error) {
          Promise.resolve(req.context.handleError(error)).then(req.context.handleResponse)
        }
      }

    return (context, next) => {
      context.emit('request-started', { context })
      this.inflight++
      context.handleError = (error: Error | null) => {
        if (error) {
          const { res } = context
          context.error = error
          //context.emit('error', { error, context })
          isWritable(res) && clearHeaders(res)
          return onError(context)
        }
      }
      context.handleResponse = this._handleResponse.bind(this, context)
      context.res.statusCode = 404
      onFinished(context.res, onResEnd)
      onFinished(context.req, onReqEnd)
      return next()
        .catch(context.handleError)
        .then(context.handleResponse)
    }
  }
}
