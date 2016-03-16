import { expect } from 'chai'
import { Server, Context, HttpServer }  from '../src/server'
import http from 'http'

const port = 8888;

describe('Server', () => {

  let server
  beforeEach(() => {
    server = new Server
    server.use((ctx, next) => next())
  })

  afterEach(() => {
    return server.close()
  })

  describe('listen', () => {
    it('returns a promise, creates a server', async () => {
      await server.listen(port)
      expect(server.webserver).to.be.an.instanceOf(HttpServer)
    })

    it('sets argument to a Context instance', async () => {
      let hasBeenCalled = false
      server.use(env => {
        expect(env).to.be.an.instanceOf(Context)
        hasBeenCalled = true
        env.res.end()
      })
      await server.listen(8080).then(() => new Promise((res,rej) => http.get('http://localhost:8080', res).on('error', rej)))
      expect(hasBeenCalled).to.be.true
    })
  })

  describe('close', () => {
    it('calls close on underlying webserver implementation', () => {
      let called = false
      server.webserver.close = function (){ called = true }
      server.close()
      expect(called).to.be.true
    })
  })
})

