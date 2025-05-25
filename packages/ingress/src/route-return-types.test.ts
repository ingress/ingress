import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Readable } from 'node:stream'
import ingress from './ingress.js'
import { inject } from '@hapi/shot'

describe('ingress', () => {
  it('route return types', async () => {
    const app = ingress(),
      { Route, Routes } = app
    @Routes('/greet')
    class Greet {
      @Route.Get('/text/:name')
      greeting(@Route.Param('name') name: string) {
        return Promise.resolve(`Hello ${name}`)
      }
      @Route.Get('/json/:name')
      jsonHello(@Route.Param('name') name: string) {
        return { Hello: name }
      }
      @Route.Get('/html/:name')
      htmlHello(@Route.Param('name') name: string) {
        return /*html*/ `
          <h1>Hello ${name}</h1>
        `.trim()
      }
      @Route.Get('/bytes/:name')
      bytesHello(@Route.Param('name') name: string) {
        return Buffer.from('Hello ' + name)
      }
      @Route.Get('/stream/:name')
      streamHello(@Route.Param('name') name: string) {
        const reads = [null, name, ' ', 'Hello']
        return new Readable({
          read() {
            this.push(reads.pop())
          },
        })
      }
      @Route.Get('/response/:name')
      responseHello(@Route.Param('name') name: string) {
        return new Response(`Hello ${name}`)
      }
      @Route.Get('/fetch/:name')
      fetchHello(req: Request, @Route.Param('name') name: string) {
        assert.strictEqual(req.url, `http://localhost/greet/fetch/${name}`)
        return new Response(`Hello ${name}`)
      }
      @Route.Get('/error/:name')
      fetchError(@Route.Param('name') name: string) {
        const err = new CustomError(`Hello ${name}`)
        err.statusCode = 502
        return err
      }
      @Route.Get('/throw/:name')
      throwError(@Route.Param('name') name: string) {
        throw new CustomError(`Hello ${name}`)
      }
    }
    await app.start()
    void Greet

    const response9 = await inject(app.driver, '/greet/throw/world')
    assert.strictEqual(response9.headers['content-length'], '79')
    assert.strictEqual(response9.headers['content-type'], 'application/json')
    assert.strictEqual(response9.statusCode, 500)
    assert.strictEqual(
      response9.payload,
      JSON.stringify({
        error: { code: 'INTERNAL_SERVER_ERROR', status: 500, message: 'Hello world' },
      }),
    )

    const response8 = await inject(app.driver, '/greet/error/world')
    assert.strictEqual(response8.headers['content-length'], '79')
    assert.strictEqual(response8.headers['content-type'], 'application/json')
    assert.strictEqual(response8.statusMessage, 'Internal Server Error')
    assert.strictEqual(response8.statusCode, 502)
    assert.strictEqual(
      response8.payload,
      JSON.stringify({
        error: { code: 'INTERNAL_SERVER_ERROR', status: 502, message: 'Hello world' },
      }),
    )

    if (typeof Response !== 'undefined') {
      const response7 = await inject(app.driver, '/greet/fetch/world')
      assert.strictEqual(response7.headers['content-length'], undefined)
      assert.strictEqual(response7.headers['content-type'], 'text/plain;charset=UTF-8')
      assert.strictEqual(response7.statusCode, 200)
      assert.strictEqual(response7.payload, 'Hello world')

      const response6 = await inject(app.driver, '/greet/response/world')
      assert.strictEqual(response6.headers['content-length'], undefined)
      assert.strictEqual(response6.headers['content-type'], 'text/plain;charset=UTF-8')
      assert.strictEqual(response6.statusCode, 200)
      assert.strictEqual(response6.payload, 'Hello world')
    }

    const response5 = await inject(app.driver, '/greet/stream/world')
    assert.strictEqual(response5.headers['content-length'], undefined)
    assert.strictEqual(response5.headers['content-type'], 'application/octet-stream')
    assert.strictEqual(response5.statusCode, 200)
    assert.strictEqual(response5.payload, 'Hello world')

    const response4 = await inject(app.driver, '/greet/bytes/world')
    assert.strictEqual(response4.headers['content-length'], '11')
    assert.strictEqual(response4.headers['content-type'], 'application/octet-stream')
    assert.strictEqual(response4.statusCode, 200)
    assert.strictEqual(response4.payload, 'Hello world')

    const response3 = await inject(app.driver, '/greet/html/world')
    assert.strictEqual(response3.headers['content-length'], '20')
    assert.strictEqual(response3.headers['content-type'], 'text/plain;charset=UTF-8')
    assert.strictEqual(response3.statusCode, 200)
    assert.strictEqual(response3.payload, `<h1>Hello world</h1>`)

    const response2 = await inject(app.driver, '/greet/json/world')
    assert.strictEqual(response2.headers['content-length'], '17')
    assert.strictEqual(response2.headers['content-type'], 'application/json')
    assert.strictEqual(response2.statusCode, 200)
    assert.strictEqual(response2.payload, '{"Hello":"world"}')

    const response = await inject(app.driver, '/greet/text/world')
    assert.strictEqual(response.headers['content-length'], '11')
    assert.strictEqual(response.headers['content-type'], 'text/plain;charset=UTF-8')
    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.payload, 'Hello world')
  })
})

class CustomError extends Error {
  public contentType = 'application/json'
  public statusCode = 500
  public statusMessage = 'Internal Server Error'
  constructor(message: string) {
    super(message)
  }
  toString() {
    return JSON.stringify({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        status: this.statusCode,
        message: this.message,
      },
    })
  }
}
