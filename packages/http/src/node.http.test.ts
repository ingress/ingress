import 'reflect-metadata'
import { beforeAll, expect, describe, it } from 'vitest'
import { createConnection } from 'net'
import { Ingress } from '@ingress/core'
import { Http } from './node.http.js'
import { finished } from 'stream'
import type { AddressInfo } from 'node:net'
import type { HttpContext } from '@ingress/types'
import { start, Started } from './request.util.test.js'

let started: Started, request: Started['request']

describe('node http ctx', () => {
  beforeAll(async () => {
    started = await start(void 0, ({ request, response }: HttpContext<any>, next: any) => {
      switch (request.pathname) {
        case '/a':
          return next()
        case '/b':
          throw new Error('some error')
        case '/c':
          throw Object.assign(new Error('some error'), { statusCode: 502 })
        case '/d':
          response.code(200).send()
      }
      return next()
    })
    request = started.request
  })

  it('no handlers (404)', async () => {
    const res = await request('/a'),
      expectedMessage = 'OK'

    expect(res.payload, 'Expected empty response body').toEqual('')
    expect(res.headers['content-type'], 'has no content (or) type').toBeUndefined()
    expect(res.statusCode).toBe(200)
    expect(res.statusMessage).toBe(expectedMessage)
  })

  it('user error (500)', async () => {
    const res = await request('/b'),
      expectedMessage = 'Internal Server Error'

    expect(res.payload).toEqual('')
    expect(res.headers['content-type']).toEqual(void 0)
    expect(res.statusCode).toEqual(500)
    expect(res.statusMessage).toEqual(expectedMessage)
  })

  it('user error (XXX)', async () => {
    const res = await request('/c'),
      expectedMessage = 'Bad Gateway'

    expect(res.payload).toEqual('')
    expect(res.headers['content-type']).toEqual(void 0)
    expect(res.statusCode).toEqual(502)
    expect(res.statusMessage).toEqual(expectedMessage)
  })

  it('user handled status', async () => {
    const res = await request('/d'),
      expectedMessage = 'OK'
    expect(res.payload).toEqual('')
    expect(res.headers['content-type']).toEqual(void 0)
    expect(res.statusCode).toEqual(200)
    expect(res.statusMessage).toEqual(expectedMessage)
  })

  it('client error handler', async () => {
    let plan = 2
    const deferred: any = {}
    deferred.promise = new Promise((resolve, reject) => {
      deferred.reject = reject
      deferred.resolve = resolve
    })
    const http = new Http({
        clientErrorHandler: (error, socket) => {
          plan--
          expect(error.message).toEqual('Parse Error')
          socket.end()
          deferred.resolve()
        },
      }),
      app = new Ingress()

    app.use(http)
    await app.run()
    const err: any = await makeClientError(http.server.address() as AddressInfo)
    expect(err?.code).toEqual('ERR_STREAM_PREMATURE_CLOSE')
    plan--
    await deferred.promise
    await app.stop()
    expect(plan).toBe(0)
  })

  it('client error default handler', async () => {
    const http = new Http(),
      app = new Ingress()
    app.use(http)
    await app.run()
    const err: any = await makeClientError(http.server.address() as AddressInfo)
    expect(err?.code).toEqual('ERR_STREAM_PREMATURE_CLOSE')
    await app.stop()
  })

  it('listen arg', async () => {
    const http = new Http({ listen: 7654 }),
      app = new Ingress<HttpContext<any>>()
    app.use(http)
    await app.run()
    expect((http.server.address() as any).port).toBe(7654)
    await app.stop()
  })

  it('listen port env', async () => {
    process.env.PORT = '8765'

    const http = new Http(),
      app = new Ingress<HttpContext<any>>()
    app.use(http)
    await app.run()
    expect((http.server.address() as any).port).toBe(8765)
    await app.stop()
  })

  it('using multiple instances (nested apps)', async () => {
    const httpA = Object.assign(new Http(), { http: 'A' }),
      httpB = Object.assign(new Http(), { http: 'B' }),
      appA = Object.assign(new Ingress<HttpContext<any>>().use(httpA), { app: 'A' }),
      appB = Object.assign(new Ingress<HttpContext<any>>().use(httpB), { app: 'B' })

    appA.use(appB)
    await appA.run()
    expect(httpA.server).toBe(httpB.server)
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
})
