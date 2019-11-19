import ingress, { Ingress } from './ingress'
import getPort = require('get-port')

describe('ingress', () => {
  let server: Ingress

  beforeEach(() => (server = ingress()))

  afterEach(async () => {
    try {
      server && (await server.close())
    } catch (e) {
      void e
    }
  })

  it('should not allow calling listen concurrently', async () => {
    const PORT = await getPort()
    server.listen({ port: PORT })
    let error: any
    try {
      await server.listen(PORT)
    } catch (e) {
      error = e
    }
    expect(error.message).toEqual('Server is already starting')
    await server.close()
  })
  it('should not allow calling close concurrently', async () => {
    const PORT = await getPort()
    await server.listen(PORT)
    let error: any
    server.close()
    try {
      await server.close()
    } catch (e) {
      error = e
    }
    expect(error.message).toEqual('Server is already closing')
  })

  it('should listen', async () => {
    const PORT = await getPort()
    await server.listen(PORT)
    let error: any
    try {
      await server.listen(PORT)
    } catch (e) {
      error = e
    }
    expect(error.code).toEqual('ERR_SERVER_ALREADY_LISTEN')
  })

  it('authenticate requests', async () => {
    const PORT = await getPort()
    server = ingress({
      authContextFactory({ req }) {
        void req
        return { authenticated: true, id: '' }
      }
    })

    await server.listen(PORT)
  })

  it('should close', async () => {
    const PORT = await getPort()
    await server.listen(PORT)
    let error: any
    try {
      await server.close()
    } catch (e) {
      error = e
    }
    expect(error).toBeUndefined()
  })
})
