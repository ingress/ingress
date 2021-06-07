import { createAnnotationFactory } from 'reflect-annotations'
import { StatusCode } from '@ingress/http-status'
import type { Middleware, DefaultContext } from '../context.js'
import type { Func } from '../lang.js'
import { parse } from 'secure-json-parse'

export interface ParseJsonBodyOptions {
  maxBytes: number
}

const parsableMethods = ['POST', 'PUT', 'OPTIONS', 'DELETE', 'PATCH']

export class ParseJsonAnnotation {
  public isBodyParser = true
  constructor(public options: ParseJsonBodyOptions = { maxBytes: 1e7 }) {}

  get middleware(): Middleware<DefaultContext> {
    const options = this.options
    return (context: DefaultContext, next: Func<Promise<any>>): any => {
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

function jsonParse(json: any) {
  try {
    return parse(json)
  } catch (e) {
    void e
  }
}

function parseJsonReq(
  context: DefaultContext,
  contentLength: number,
  next: () => any,
  options: ParseJsonBodyOptions
) {
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

  function respond() {
    deferred.resolve()
    return context.handleResponse()
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
      return respond()
    }

    if (!Number.isNaN(contentLength) && byteLength !== contentLength) {
      context.res.statusCode = StatusCode.BadRequest
      context.res.statusMessage = 'Content Size Mismatch'
      return respond()
    }

    const body = jsonParse(rawBody)
    if (rawBody && body === void 0) {
      context.res.statusCode = StatusCode.BadRequest
      context.res.statusMessage = 'Unexpected end of input'
      return respond()
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
