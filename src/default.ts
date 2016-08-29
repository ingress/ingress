import { Buffer } from 'buffer'
import { Middleware } from 'app-builder'
import { Context } from './context'
import * as statuses from 'statuses'
import { ServerResponse } from 'http'

const looksLikeHtmlRE = /^\s*</,
  cl = (res: ServerResponse, length: string | number) => res.setHeader('Content-Length', length.toString()),
  ct = (res: ServerResponse, value: string) => res.setHeader('Content-Type', value)

function statusResponse (status: number, message: string, res: ServerResponse, body?: string) {
  res.statusCode = status || 404
  res.statusMessage = message = message || statuses[res.statusCode] || ''
  body = body || message
  ct(res, 'text/plain')
  cl(res, Buffer.byteLength(body))
  res.end(body)
}

function defaultHandler (ctx: Context) {
  const res = <any>ctx.res,
    hasContentType = Boolean(res._headers && res._headers['content-type'])

  if (res.headersSent || res.socket && !res.socket.writable) {
    return //cannot respond
  }

  let body = ctx.body

  if (ctx.error) {
    return statusResponse(500, res.statusMessage, res, body)
  }

  if (statuses.empty[res.statusCode]) {
    res._headers = {}
    return res.end()
  }
  if (!body) {
    //not found
    return statusResponse(res.statusCode, res.statusMessage, res)
  }

  if ('string' === typeof body) {
    !hasContentType && ct(res, 'text/' + (looksLikeHtmlRE.test(body) ? 'html' : 'plain'))
    cl(res, Buffer.byteLength(body))
    return res.end(body)
  }
  if (Buffer.isBuffer(body)) {
    !hasContentType && ct(res, 'application/octet-stream')
    cl(res, body.length)
    return res.end(body)
  }
  if ('function' === typeof body.pipe) {
    !hasContentType && ct(res, 'application/octet-stream')
    //TODO handle stream end, errors
    return body.pipe(res)
  }
  body = JSON.stringify(body)
  ct(res, 'application/json')
  cl(res, Buffer.byteLength(body))
  res.end(body)
}

export default function <T extends Context> (onError: Middleware<T>) {
  function defaultRequestHandler (context: T, next: Middleware<T>) {
    context.res.statusCode = 404
    return next().then(null, (error: Error) => {
      context.error = error
      return onError(context)
    }).then(() => defaultHandler(context))
  }

  (<any>defaultRequestHandler).register = (<any>onError).register

  return defaultRequestHandler
}
