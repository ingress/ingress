import { expect } from 'chai'
import { Buffer } from 'buffer'
import * as fs from 'fs'
import { ServerResponse, IncomingMessage } from 'http'
import { makeRequest, getResponse } from './http'
import { Server, DefaultContext, DefaultMiddleware } from '../src'

const port = 8888

describe('Server', () => {
  let server: Server<DefaultContext>
  beforeEach(() => {
    server = new Server<DefaultContext>({
      contextFactory: ({ req, res }: { req: IncomingMessage; res: ServerResponse }) =>
        new DefaultContext(req, res)
    })
    server.use((_, next) => next())
  })

  afterEach(() => {
    return server.close()
  })

  describe('listen', () => {
    it('sets argument to a Context instance', async () => {
      let hasBeenCalled = false
      server.use(ctx => {
        expect(ctx.req.context).to.equal(ctx)
        expect(ctx.res.context).to.equal(ctx)
        hasBeenCalled = true
        ctx.res.end()
        return Promise.resolve()
      })
      await server.listen(port)
      await makeRequest('/')
      expect(hasBeenCalled).to.be.true
    })
  })

  describe('close', () => {
    it('calls close on underlying webserver implementation', () => {
      let called = false
      const close = server.webserver.close
      server.webserver.close = function(res: any) {
        called = true
        res()
        return close.call(this)
      }
      server.close()
      expect(called).to.be.true
    })
  })

  describe('DefaultMiddleware', () => {
    beforeEach(() => {
      server.use(new DefaultMiddleware<DefaultContext>())
    })

    it('should respond with json, when set on context body', async () => {
      let length: number | null = null
      server.use((ctx, next) => {
        ctx.body = { plain: 'object' }
        length = JSON.stringify(ctx.body).length
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(+res.headers['content-length']!).to.equal(length)
      expect(res.headers['content-type']).to.equal('application/json')
    })

    it('should respond with octet-stream, when buffer is set on context body', async () => {
      let length: number | null = null
      server.use((ctx, next) => {
        ctx.body = new Buffer(JSON.stringify({ plain: 'object' }))
        length = ctx.body.length
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(+res.headers['content-length']!).to.equal(length)
      expect(res.headers['content-type']).to.equal('application/octet-stream')
    })

    it('should respond with html, when set on context body', async () => {
      let length: number | null = null
      server.use((ctx, next) => {
        ctx.body = "<div>I'm HTML!</div>"
        length = ctx.body.length
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(+res.headers['content-length']!).to.equal(length)
      expect(res.headers['content-type']).to.equal('text/html')
    })
    Object
    it('should respond with text, when set on context body', async () => {
      let length: number | null = null
      server.use((ctx, next) => {
        ctx.body = 'just text'
        length = ctx.body.length
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(+res.headers['content-length']!).to.equal(length)
      expect(res.headers['content-type']).to.equal('text/plain')
    })

    it('should not respond when the request has already been handled', async () => {
      let length: number | null = null
      server.use((ctx, next) => {
        const text = 'ended!'
        length = text.length
        ctx.res.end(text)
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(+res.headers['content-length']!).to.equal(length)
      expect(res.headers['content-type']).to.be.undefined
    })

    it('should respond 404 when no body is set', async () => {
      server.use((_, next) => {
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(res.statusCode).to.equal(404)
      const response = await getResponse(res)
      expect(response).to.equal('Not Found')
    })

    it('should respond 500 when error is set', async () => {
      server.use((ctx, next) => {
        ctx.error = new Error()
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(res.statusCode).to.equal(500)
      expect(await getResponse(res)).to.equal('Internal Server Error')
    })

    it('should respond 500 with a body when set', async () => {
      const expectedBody = 'some error stack or something'

      server.use((ctx, next) => {
        ctx.error = new Error()
        ctx.body = expectedBody
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')

      expect(res.statusCode).to.equal(500)
      expect(await getResponse(res)).to.equal(expectedBody)
    })

    it('strip the headers on an empty response (code)', async () => {
      server.use((ctx, next) => {
        ctx.res.setHeader('DeleteMe', 'key:value')
        ctx.res.statusCode = 204
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(Object.keys(res.headers)).to.eql(['date', 'connection'])
      expect(res.statusCode).to.equal(204)
    })

    it('not return body result for head requests (cannot test with node native client)', async () => {
      const expectedBody = ''
      let expectedLength = 0

      server.use((ctx, next) => {
        ctx.res.statusCode = 200
        expectedLength = Buffer.byteLength(JSON.stringify({ test: 'obj' }))
        ctx.body = { test: 'obj' }
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/', 'HEAD')
      expect(await getResponse(res)).to.equal(expectedBody)
      expect(+res.headers['content-length']!).to.equal(expectedLength)
      expect(res.statusCode).to.equal(200)
    })

    it('should return that which is streamed', async () => {
      const expectedBody = fs.readFileSync('./package.json').toString()

      server.use((ctx, next) => {
        ctx.res.statusCode = 200
        ctx.body = fs.createReadStream('./package.json')
        return next()
      })
      await server.listen(port)
      const res = await makeRequest('/')
      expect(res.headers['content-type']).to.equal('application/octet-stream')
      expect(await getResponse(res)).to.equal(expectedBody)
      expect(res.statusCode).to.equal(200)
    })
  })
})
