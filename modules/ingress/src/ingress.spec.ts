import ingress, { Ingress } from './ingress'
import getPort from 'get-port'

describe('ingress', () => {
  let app: Ingress

  beforeEach(() => (app = ingress()))

  afterEach(async () => {
    try {
      app && (await app.stop())
    } catch (e) {
      void e
    }
  })

  it('should not allow calling listen concurrently', async () => {
    const PORT = await getPort(),
      callToListen = app.listen({ port: PORT })
    let error: any
    try {
      await app.listen(PORT)
    } catch (e) {
      error = e
    }
    await callToListen
    expect(error.message).toEqual('Already started or starting')
    await app.stop()
  })
  it('should not allow calling close concurrently', async () => {
    const PORT = await getPort()
    await app.listen(PORT)
    let error: any
    app.stop()
    try {
      await app.stop()
    } catch (e) {
      error = e
    }
    expect(error.message).toEqual('Already stopped or stopping')
  })

  it('should listen', async () => {
    const PORT = await getPort()
    await app.listen(PORT)
  })

  it('authenticate requests', async () => {
    const PORT = await getPort()
    app = ingress({
      authContextFactory({ req }) {
        void req
        return { authenticated: true, id: '' }
      },
    })

    await app.listen(PORT)
  })

  it('should close', async () => {
    const PORT = await getPort()
    await app.listen(PORT)
    let error: any
    try {
      await app.stop()
    } catch (e) {
      error = e
    }
    expect(error).toBeUndefined()
  })
})
