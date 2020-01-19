import ingress, { Ingress } from './ingress'
import { Readable } from 'stream'
import getPort from 'get-port'
import fetch from 'cross-fetch'

describe('default ingress responses', () => {
  let app: Ingress

  beforeEach(() => {
    app = ingress({
      routes: []
    })
  })

  afterEach(async () => {
    try {
      app && (await app.stop())
    } catch (e) {
      void e
    }
  })

  it('should respond with json', async () => {
    app.use((context, next) => {
      context.body = { hello: 'world' }
      return next()
    })
    const PORT = await getPort()
    await app.listen(PORT)
    const result = await fetch(`http://localhost:${PORT}`).then(x => x.json())

    expect(result.hello).toEqual('world')
  })

  it('should respond with json (from stream) (set content length)', async () => {
    const expectedBody = JSON.stringify({ hello: 'world' })
    app.use((context, next) => {
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
    await app.listen(PORT)
    const result = await fetch(`http://localhost:${PORT}`).then(x => {
      expect(x.headers.get('content-length')).toEqual(expectedBody.length.toString())
      expect(x.headers.get('content-type')).toEqual('application/octet-stream')
      return x.json()
    })
    expect(result.hello).toEqual('world')
  })

  it('should respond with json (from buffer)', async () => {
    const expectedBody = JSON.stringify({ hello: 'world' })
    app.use((context, next) => {
      context.body = Buffer.from(JSON.stringify({ hello: 'world' }))
      return next()
    })
    const PORT = await getPort()
    await app.listen(PORT)
    const result = await fetch(`http://localhost:${PORT}`).then(x => {
      expect(x.headers.get('content-length')).toEqual(expectedBody.length.toString())
      expect(x.headers.get('content-type')).toEqual('application/octet-stream')
      return x.json()
    })
    expect(result.hello).toEqual('world')
  })

  it('should set content length and type', async () => {
    const expectedBody = JSON.stringify({ hello: 'world' })
    app.use((context, next) => {
      context.body = { hello: 'world' }
      return next()
    })
    const PORT = await getPort()
    await app.listen(PORT)
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
    app.use((context, next) => {
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
    await app.listen(PORT)
    await fetch(`http://localhost:${PORT}`).then(x => {
      expect(x.headers.get('content-length')).toEqual(expectedBody.length.toString())
      expect(x.headers.get('content-type')).toEqual('application/json')
      return x.json()
    })
    await new Promise(r => setTimeout(r, 2000))
    expect(events).toEqual(['response-finished', 'request-finished'])
  })
})
