import { IncomingMessage, ServerResponse } from 'http'
import { Buffer } from 'buffer'
import * as statuses from 'statuses'

export type RequestContext = { req: IncomingMessage, res: ServerResponse }

export default function <T extends Context> ({req, res }: RequestContext): Context {
  return new Context(req, res)
}

export interface DefaultContext {
  req: IncomingMessage
  res: ServerResponse
  error: Error
  handleResponse(): Promise<any>
  body: any
}

const looksLikeHtmlRE = /^\s*</

export class Context implements DefaultContext {
  public req: IncomingMessage
  public res: ServerResponse
  public error: Error
  public body: any
  constructor (req: IncomingMessage, res: ServerResponse) {
    this.req = req
    this.res = res
  }

  _contentLength (res: ServerResponse, length: number) {
    res.setHeader('Content-Length', length.toString())
  }

  _contentType (res: ServerResponse, value: string) {
    res.setHeader('Content-Type', value)
  }

  _statusResponse (status: number, message: string, res: ServerResponse, body?: string) {
    res.statusCode = status || 404
    res.statusMessage = message = message || statuses[res.statusCode] || ''
    body = body || message
    this._contentType(res, 'text/plain')
    this._contentLength(res, Buffer.byteLength(body))
    res.end(body)
  }

  handleResponse () {
    const res = <any>this.res,
      hasContentType = Boolean(res._headers && res._headers['content-type'])

    if (res.headersSent || res.socket && !res.socket.writable) {
      return
    }

    let body = this.body

    if (this.error) {
      return this._statusResponse(500, res.statusMessage, res, body)
    }

    if (statuses.empty[res.statusCode]) {
      res._headers = {}
      return res.end()
    }
    if (!body) {
      return this._statusResponse(res.statusCode, res.statusMessage, res)
    }

    if ('string' === typeof body) {
      !hasContentType && this._contentType(res, 'text/' + (looksLikeHtmlRE.test(body) ? 'html' : 'plain'))
      this._contentLength(res, Buffer.byteLength(body))
      return res.end(body)
    }
    if (Buffer.isBuffer(body)) {
      !hasContentType && this._contentType(res, 'application/octet-stream')
      this._contentLength(res, body.length)
      return res.end(body)
    }
    if ('function' === typeof body.pipe) {
      !hasContentType && this._contentType(res, 'application/octet-stream')
      //TODO handle stream end, errors
      return body.pipe(res)
    }
    body = JSON.stringify(body)
    this._contentType(res, 'application/json')
    this._contentLength(res, Buffer.byteLength(body))
    res.end(body)
  }

}
