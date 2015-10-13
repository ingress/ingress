import Stream from 'stream'
import statuses from 'statuses'

const emptyStatuses = {
    204: true,
    205: true,
    304: true
  },
  objToString = ({}).toString,
  isError = e => {
    e && typeof e === 'object'
    && typeof e.message === 'string'
    && objToString.call(e) === '[object Error]'
  },
  looksLikeHtmlRE = /^\s*</

function statusResponse (status, message, res) {
  res._headers = {}
  res.statusCode = status || 404
  message = message || statuses[res.statusCode] || ''
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Content-Length', Buffer.byteLength(message))
  res.end(message)
}

function cannotRespond (res) {
  return res.finished || res.headersSent || res.socket && !res.socket.writable
}

export function defaultError (ctx) {
  const res = ctx.res

  if (cannotRespond(res)) {
    return
  }

  statusResponse(res.statusCode || 500, res.statusMessage, res)
}


export function defaultHandler(ctx) {
  let body = ctx.body
  const res = ctx.res
  if (cannotRespond(res)) {
    return
  }
  if (emptyStatuses[res.statusCode]) {
    res._headers = {}
    res.statusCode = res.statusCode || 204
    return res.end()
  }
  if (!body) {
    return statusResponse(res.statusCode, res.statusMessage, res)
  }
  if (typeof body === 'string') {
    res.setHeader('Content-Type', 'text/' + (looksLikeHtmlRE.test(body) ? 'html' : 'plain'))
    res.setHeader('Content-Length', Buffer.byteLength(body))
    return res.end(body)
  }
  if (Buffer.isBuffer(body)) {
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Length', body.length)
    return res.end(body)
  }
  if (body instanceof Stream) {
    res.setHeader('Content-Type', 'application/octet-stream')
    //todo cleanup, headers
    return body.pipe(res)
  }
  body = JSON.stringify(body)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.end(body)
}