import { describe, it, expect } from 'vitest'
import { Readable } from 'stream'
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
        expect(req.url).toEqual(`http://localhost/greet/fetch/${name}`)
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
    expect(response9.headers['content-length']).toEqual('72')
    expect(response9.headers['content-type']).toEqual('application/json')
    expect(response9.statusCode).toEqual(500)
    expect(response9.payload).toEqual(
      JSON.stringify({
        error: { code: 'INTERNAL_ERROR', status: 500, message: 'Hello world' },
      })
    )

    const response8 = await inject(app.driver, '/greet/error/world')
    expect(response8.headers['content-length']).toEqual('72')
    expect(response8.headers['content-type']).toEqual('application/json')
    expect(response8.statusMessage).toEqual('Internal Server Error')
    expect(response8.statusCode).toEqual(502)
    expect(response8.payload).toEqual(
      JSON.stringify({
        error: { code: 'INTERNAL_ERROR', status: 502, message: 'Hello world' },
      })
    )

    const response7 = await inject(app.driver, '/greet/fetch/world')
    expect(response7.headers['content-length']).toEqual(undefined)
    expect(response7.headers['content-type']).toEqual('text/plain;charset=UTF-8')
    expect(response7.statusCode).toEqual(200)
    expect(response7.payload).toEqual('Hello world')

    const response6 = await inject(app.driver, '/greet/response/world')
    expect(response6.headers['content-length']).toEqual(undefined)
    expect(response6.headers['content-type']).toEqual('text/plain;charset=UTF-8')
    expect(response6.statusCode).toEqual(200)
    expect(response6.payload).toEqual('Hello world')

    const response5 = await inject(app.driver, '/greet/stream/world')
    expect(response5.headers['content-length']).toEqual(undefined)
    expect(response5.headers['content-type']).toEqual('application/octet-stream')
    expect(response5.statusCode).toEqual(200)
    expect(response5.payload).toEqual('Hello world')

    const response4 = await inject(app.driver, '/greet/bytes/world')
    expect(response4.headers['content-length']).toEqual('11')
    expect(response4.headers['content-type']).toEqual('application/octet-stream')
    expect(response4.statusCode).toEqual(200)
    expect(response4.payload).toEqual('Hello world')

    const response3 = await inject(app.driver, '/greet/html/world')
    expect(response3.headers['content-length']).toEqual('20')
    expect(response3.headers['content-type']).toEqual('text/plain;charset=UTF-8')
    expect(response3.statusCode).toEqual(200)
    expect(response3.payload).toEqual(`<h1>Hello world</h1>`)

    const response2 = await inject(app.driver, '/greet/json/world')
    expect(response2.headers['content-length']).toEqual('17')
    expect(response2.headers['content-type']).toEqual('application/json')
    expect(response2.statusCode).toEqual(200)
    expect(response2.payload).toEqual('{"Hello":"world"}')

    const response = await inject(app.driver, '/greet/text/world')
    expect(response.headers['content-length']).toEqual('11')
    expect(response.headers['content-type']).toEqual('text/plain;charset=UTF-8')
    expect(response.statusCode).toEqual(200)
    expect(response.payload).toEqual('Hello world')
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
        code: 'INTERNAL_ERROR',
        status: this.statusCode,
        message: this.message,
      },
    })
  }
}
