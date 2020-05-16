import { createAnnotationFactory } from 'reflect-annotations'
import { StatusCode } from '@ingress/http-status'
import { Middleware, DefaultContext } from '../context'

export interface ParseJsonBodyOptions {
  maxBytes: number
}

const parsableMethods = ['POST', 'PUT', 'OPTIONS', 'DELETE', 'PATCH']

export class ParseJsonAnnotation {
  public isBodyParser = true
  constructor(public options: ParseJsonBodyOptions = { maxBytes: 1e7 }) {}

  get middleware(): Middleware<DefaultContext> {
    const options = this.options
    return (context, next) => {
      const {
        req: { headers, method },
      } = context

      if (method === 'GET' || method === 'HEAD') return next()

      const contentType = headers['content-type'],
        contentLength = Number.parseInt(headers['content-length'] ?? '', 10)

      if (method && ~parsableMethods.indexOf(method)) {
        if (!contentType && !contentLength && headers['transfer-encoding'] === void 0) {
          return next()
        }
        if (contentType && ~contentType.indexOf('application/json')) {
          return parseJsonReq(context, contentLength, next, options)
        }
      } else {
        context.res.statusCode = StatusCode.MethodNotAllowed
        context.handleResponse()
      }
      context.res.statusCode = StatusCode.UnsupportedMediaType
      context.handleResponse()
    }
  }
}

function jsonParse(body: string) {
  try {
    return JSON.parse(body)
  } catch (e) {
    void e
  }
}

function parseJsonReq(context: DefaultContext, contentLength: number, next: () => any, options: ParseJsonBodyOptions) {
  const { maxBytes } = options,
    { req } = context
  let byteLength = 0,
    rawBody = ''
  req.on('data', onChunk).on('end', onReqEnd).on('error', onReqEnd)

  const deferred: any = {}

  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve
    deferred.reject = reject
  })

  function onChunk(chunk: Buffer) {
    byteLength += chunk.byteLength
    if (byteLength > maxBytes) {
      return onReqEnd(null, StatusCode.PayloadTooLarge)
    }
    rawBody += chunk.toString()
  }

  function onReqEnd(error: Error | null, statusCode?: number) {
    req.removeListener('data', onChunk)
    req.removeListener('end', onReqEnd)
    req.removeListener('error', onReqEnd)

    if (error) {
      ;(error as any).statusCode = (error as any).statusCode || StatusCode.BadRequest
      return deferred.reject(error)
    }

    if (statusCode) {
      context.res.statusCode = statusCode
      return context.handleResponse()
    }

    if (!Number.isNaN(contentLength) && byteLength !== contentLength) {
      context.res.statusCode = StatusCode.BadRequest
      context.res.statusMessage = 'Content Size Mismatch'
      return context.handleResponse()
    }

    const body = jsonParse(rawBody)
    if (rawBody && body === void 0) {
      context.res.statusCode = StatusCode.BadRequest
      context.res.statusMessage = 'Unexpected end of input'
      return context.handleResponse()
    }
    context.route.parserResult = rawBody
    context.route.body = body
    deferred.resolve(next())
  }
  return deferred.promise
}

const ParseJson = createAnnotationFactory(ParseJsonAnnotation),
  parseJson = new ParseJsonAnnotation().middleware
export { parseJson, ParseJson }
