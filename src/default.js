import { isBuffer, byteLength } from 'buffer'
import statuses from 'statuses'

const looksLikeHtmlRE = /^\s*</,
  cl = (res, value) => res.setHeader('Content-Length', value),
  ct = (res, value) => res.setHeader('Content-Type', value)


function statusResponse (status, message, res) {
  res._headers = {}
  res.statusCode = status || 404
  message = message || statuses[res.statusCode] || ''
  ct(res, 'text/plain')
  cl(res, byteLength(message))
  res.end(message)
}

function defaultHandler (ctx) {
  const res = ctx.res,
    hasContentType = Boolean(res._headers['content-type']),
    canRespond = res.socket && res.socket.writable && !res.headersSent || false

  if (!canRespond) {
    return
  }

  if (ctx.hasError) {
    //500
    return statusResponse(res.statusCode || 500, res.statusMessage, res)
  }

  let body = ctx.body

  if (statuses.empty[res.statusCode]) {
    res._headers = {}
    return res.end()
  }

  if (!body) {
    //not found
    return statusResponse(res.statusCode, res.statusMessage, res)
  }

  if (typeof body === 'string') {
    !hasContentType && ct(res, 'text/' + (looksLikeHtmlRE.test(body) ? 'html' : 'plain'))
    cl(res, byteLength(body))
    return res.end(body)
  }
  if (isBuffer(body)) {
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
  cl(res, byteLength(body))
  res.end(body)
}

export default function (onError) {
  return function defaultHandler (context, next) {
    return next.then(null, error => {
      context.hasError = context.error = error
      return onError(context)
    }).then(() => defaultHandler(context))
  }
}