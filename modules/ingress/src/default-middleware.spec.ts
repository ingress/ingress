import ingress, { Ingress } from './ingress'
import { Readable } from 'stream'
import getPort = require('get-port')
import fetch from 'cross-fetch'

describe('default ingress responses', () => {
  let server: Ingress

  beforeEach(() => {
    server = ingress({
      routes: []
    })
  })

  afterEach(async () => {
    try {
      server && (await server.close())
    } catch (e) {
      void e
    }
  })

  it('should respond with json', async () => {
    server.use((context, next) => {
      context.body = { hello: 'world' }
      return next()
    })
    const PORT = await getPort()
    await server.listen(PORT)
    const result = await fetch(`http://localhost:${PORT}`).then(x => x.json())

    expect(result.hello).toEqual('world')
  })

  it('should respond with json (from stream) (set content length)', async () => {
    const expectedBody = JSON.stringify({ hello: 'world' })
    server.use((context, next) => {
      const content = JSON.stringify({ hello: 'world' })
      context.res.setHeader('content-length', content.length)
      context.body = new Readable({
        read() {
          this.push(content)
          this.push(null)
        }
      })

      return next()
    })
    const PORT = await getPort()
    await server.listen(PORT)
    const result = await fetch(`http://localhost:${PORT}`).then(x => {
      expect(x.headers.get('content-length')).toEqual(expectedBody.length.toString())
      expect(x.headers.get('content-type')).toEqual('application/octet-stream')
      return x.json()
    })
    expect(result.hello).toEqual('world')
  })

  it('should respond with json (from buffer)', async () => {
    const expectedBody = JSON.stringify({ hello: 'world' })
    server.use((context, next) => {
      context.body = Buffer.from(JSON.stringify({ hello: 'world' }))
      return next()
    })
    const PORT = await getPort()
    await server.listen(PORT)
    const result = await fetch(`http://localhost:${PORT}`).then(x => {
      expect(x.headers.get('content-length')).toEqual(expectedBody.length.toString())
      expect(x.headers.get('content-type')).toEqual('application/octet-stream')
      return x.json()
    })
    expect(result.hello).toEqual('world')
  })

  it('should set content length and type', async () => {
    const expectedBody = JSON.stringify({ hello: 'world' })
    server.use((context, next) => {
      context.body = { hello: 'world' }
      return next()
    })
    const PORT = await getPort()
    await server.listen(PORT)
    const result = await fetch(`http://localhost:${PORT}`).then(x => {
      expect(x.headers.get('content-length')).toEqual(expectedBody.length.toString())
      expect(x.headers.get('content-type')).toEqual('application/json')
      return x.json()
    })
    expect(result.hello).toEqual('world')
  })

  it('emit request lifecycle events', async () => {
    const expectedBody = JSON.stringify({ hello: 'world' })
    const events: string[] = []
    server.use((context, next) => {
      context
        .once('request-finished', () => {
          events.push('request-finished')
        })
        .once('response-finished', () => {
          events.push('response-finished')
        })

      context.body = { hello: 'world' }
      return next()
    })
    const PORT = await getPort()
    await server.listen(PORT)
    await fetch(`http://localhost:${PORT}`).then(x => {
      expect(x.headers.get('content-length')).toEqual(expectedBody.length.toString())
      expect(x.headers.get('content-type')).toEqual('application/json')
      return x.json()
    })
    await new Promise(r => setTimeout(r, 2000))
    expect(events).toEqual(['response-finished', 'request-finished'])
  })
})
