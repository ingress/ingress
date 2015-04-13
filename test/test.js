import {expect} from 'chai'
import Server from '../src/index'
import http from 'http'

describe('listen', () => {
  let server
  beforeEach(() => {
    server = new Server()
    server.use(() => {})
  })

  afterEach(done => {
    !server.httpServer && done()
    server.httpServer && server.httpServer.close(done)
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
})

