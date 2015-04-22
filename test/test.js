import {expect} from 'chai'
import { Server, Environment }  from '../src/index'
import http from 'http'

describe('listen', () => {
  let server
  beforeEach(() => {
    server = new Server()
    server.use(env => env.next())
  })

  afterEach(done => {
    if(server.httpServer) {
      server.httpServer.close()
      done()
    } else {
      done()
    }
  })

  it('can be awaited, creates a server', async () => {
    await server.listen(8000)
    expect(server.httpServer).to.be.an.instanceOf(http.Server)
  })

  it('throws if called twice', async () => {
    await server.listen(8000)
    try {
      await server.listen(8000)
    } catch (e){
      expect(e).to.be.an.instanceOf(Error)
    }
  })

  it('sets argument to an Environment instance', async () => {
    server.use(env => {
      expect(env).to.be.an.instanceOf(Environment)
      env.response.end()
    })
    return server.listen(8080)
      .then(() => new Promise(res => http.get('http://localhost:8080', res)))
  })
})

