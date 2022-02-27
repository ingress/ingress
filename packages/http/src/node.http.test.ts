import 'reflect-metadata'
import * as t from 'uvu/assert'
import { test } from 'uvu'
import { createConnection } from 'net'
import { Func, Ingress } from '@ingress/core'
import { Http } from './node.http.js'
import { finished } from 'stream'
import type { AddressInfo } from 'node:net'
import type { HttpContext } from '@ingress/types'
import { start, Started } from './request.util.test.js'

let started: Started, request: Started['request']

test.before(async () => {
  started = await start(void 0, ({ request, send }: HttpContext<any>, next: Func) => {
    switch (request.pathname) {
      case '/a':
        return next()
      case '/b':
        throw new Error('some error')
      case '/c':
        throw Object.assign(new Error('some error'), { statusCode: 502 })
      case '/d':
        send.code(200)()
    }
    return next()
  })
  request = started.request
})

const oldPort = process.env.PORT
test.after(async () => {
  process.env.PORT = oldPort
  await started.app.stop()
})

test('no handlers (404)', async () => {
  const res = await request('/a'),
    expectedMessage = 'OK'

  t.equal(res.payload, '', 'Expected empty response body')
  t.equal(res.headers.get('content-type'), null, 'has no content (or) type')
  t.equal(res.status, 200, '200')
  t.equal(res.statusText, expectedMessage, expectedMessage)
})

test('user error (500)', async () => {
  const res = await request('/b'),
    expectedMessage = 'Internal Server Error'

  t.equal(res.payload, '', 'Expected empty response body')
  t.equal(res.headers.get('content-type'), null, 'has no content (or) type')
  t.equal(res.status, 500, '500')
  t.equal(res.statusText, expectedMessage, expectedMessage)
})

test('user error (XXX)', async () => {
  const res = await request('/c'),
    expectedMessage = 'Bad Gateway'

  t.equal(res.payload, '', 'Expected empty response body')
  t.equal(res.headers.get('content-type'), null, 'has no content (or) type')
  t.equal(res.status, 502, '502')
  t.equal(res.statusText, expectedMessage, expectedMessage)
})

test('user handled status', async () => {
  const res = await request('/d'),
    expectedMessage = 'OK'
  t.equal(res.payload, '', 'Expected empty response body')
  t.equal(res.headers.get('content-type'), null, 'null content-type')
  t.equal(res.status, 200, '200')
  t.equal(res.statusText, expectedMessage, 'ok')
})

test('client error handler', async () => {
  let plan = 2
  const deferred: any = {}
  deferred.promise = new Promise((resolve, reject) => {
    deferred.reject = reject
    deferred.resolve = resolve
  })
  const http = new Http({
      clientErrorHandler: (error, socket) => {
        plan--
        t.is(error.message, 'Parse Error', 'expected parse error')
        socket.end()
        deferred.resolve()
      },
    }),
    app = new Ingress()
  app.use(http)
  await app.run()
  const err: any = await makeClientError(http.server.address() as AddressInfo)
  t.equal(err?.code, 'ERR_STREAM_PREMATURE_CLOSE', 'expected premature close')
  plan--
  await deferred.promise
  await app.stop()
  t.is(plan, 0)
})

test('client error default handler', async () => {
  await request('/a')
  const err: any = await makeClientError(started.address)
  t.equal(err?.code, 'ERR_STREAM_PREMATURE_CLOSE', 'expected premature close')
})

test('listen arg', async () => {
  const http = new Http({ listen: 7654 }),
    app = new Ingress()
  app.use(http)
  await app.run()
  t.is((http.server.address() as any).port, 7654)
  await app.stop()
})

test('listen port env', async () => {
  process.env.PORT = '8765'

  const http = new Http(),
    app = new Ingress()

  app.use(http)
  await app.run()
  t.is((http.server.address() as any).port, 8765)
  await app.stop()
})

test('using multiple instances (nested apps)', async () => {
  const httpA = Object.assign(new Http(), { http: 'A' }),
    httpB = Object.assign(new Http(), { http: 'B' }),
    appA = Object.assign(new Ingress().use(httpA), { app: 'A' }),
    appB = Object.assign(new Ingress().use(httpB), { app: 'B' })

  appA.use(appB)
  await appA.run()
  t.is(httpA.server, httpB.server)
  await appA.stop()
})

async function makeClientError(addr: AddressInfo) {
  const { address, port } = addr,
    err = await new Promise((resolve) => {
      const conn = createConnection(port, address, async () => {
        conn.setNoDelay(true)
        conn.on('data', (datum) => {
          console.log(datum.toString())
        })
        conn.write(`GET /e HTTP/1.1\r\n' + 'Cont`)
        finished(conn, (err) => {
          resolve(err)
        })
        conn.destroy()
      })
    })
  return err
}

test.run()
