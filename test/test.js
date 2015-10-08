import { expect } from 'chai'
import { Server, Environment, HttpServer }  from '../src/Server'
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

    it('throws if called twice', async () => {
      await server.listen(port)
      try {
        await server.listen(port)
        throw 'not an error'
      } catch (e){
        expect(e).to.be.an.instanceOf(Error)
      }
    })

    it('sets argument to an Environment instance', async () => {
      server.use(env => {
        expect(env).to.be.an.instanceOf(Environment)
        env.res.end()
      })
      return server.listen(8080)
        .then(() => new Promise((res,rej) => http.get('http://localhost:8080', res).on('error', rej)))
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

