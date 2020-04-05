/* eslint-disable @typescript-eslint/no-unused-vars */
import ingress, { Route, IngressApp } from '../ingress'
import * as sinon from 'sinon'
import getPortAsync from 'get-port'
import { getAsync, postAsync } from './test-util'

async function getPort() {
  const port = await getPortAsync()
  return {
    port,
    path(uri: string) {
      return `http://localhost:${port}${uri}`
    },
  }
}

describe('Routing', () => {
  let app: IngressApp,
    routeSpy: sinon.SinonSpy,
    // orderedSpys: sinon.SinonSpy[],
    // errorStub: sinon.SinonStub,
    expectedResponse: string

  beforeEach(() => {
    app = ingress()
    routeSpy = sinon.spy()
  })

  afterEach(() => {
    return app.stop()
  })

  it('should route', async () => {
    const { Controller } = app
    expectedResponse = 'Hello World'

    @Controller('route')
    class MyRoutes {
      @Route.Get('test', Route.Post, Route.Put)
      someroute() {
        routeSpy()
        return expectedResponse
      }
    }
    const { port, path } = await getPort()
    await app.listen(+port)
    const getResponse = await getAsync(path('/route/test'))
    const postResponse = await postAsync(path('/route/test'), {})
    expect(getResponse).toEqual(expectedResponse)
    expect(postResponse).toEqual(expectedResponse)
    sinon.assert.calledTwice(routeSpy)
  })

  // it('should call middleware in order', async () => {
  //   const response = await getAsync('/api/test/ordered-middleware')
  //   sinon.assert.callOrder(...orderedSpys)
  // })

  // it('$ should ignore all route prefixes', async () => {
  //   expectedResponse = Math.random().toString()
  //   const response = await getAsync('/route')
  //   expect(response).toEqual(expectedResponse)
  // })

  // it('~ should ignore parent route prefixes', async () => {
  //   expectedResponse = Math.random().toString()
  //   const response = await getAsync('/api/route')
  //   expect(response).toEqual(expectedResponse)
  // })

  // it('should register multiple methods', async () => {
  //   expectedResponse = Math.random().toString()
  //   const res1 = await getAsync('/api/route')
  //   const res2 = await postAsync('/api/route', {})
  //   expect(res1 === res2).toBe(true)
  //   expect(res1).toEqual(expectedResponse)
  // })

  // it('should allow empty paths', async () => {
  //   expectedResponse = Math.random().toString()
  //   const response = await getAsync('/api/test/route')
  //   expect(response).toEqual(expectedResponse)
  // })

  // it('should resolve a controller for each request', async () => {
  //   expectedResponse = Math.random().toString()
  //   await getAsync('/api/route')
  //   const oldSpy = routeSpy
  //   await getAsync('/api/route')
  //   expect(oldSpy !== routeSpy).toBeTruthy()
  // })

  // it('should parse the body, query and route parameters', async () => {
  //   expectedQuery = { a: 'b', b: 'c' }
  //   expectedParams = { a: '1', b: '2', c: '3' }
  //   expectedBody = { hello: 'world' }

  //   const response = await postAsync('/api/abc/1/2/3?a=b&b=c', expectedBody)
  //   expect(response).toEqual(expectedResponse)
  // })

  // it('should return 404 for missing routes', async () => {
  //   expect(await getAsync('/api/missing')).toEqual('Not Found')
  // })

  // it('should allow a custom body parser', () => {
  //   return postAsync('/api/test-buffer', { data: 'asdf' }).then(() => {
  //     sinon.assert.calledOnce(routeSpy)
  //   })
  // })

  // describe('parameter lookup', () => {
  //   it('should look up a body param', () => {
  //     return postAsync('/api/param-lookup/body-lookup', 'content').then((res: any) => {
  //       expect(res).toEqual('content')
  //     })
  //   })

  //   it('should look up a path param', () => {
  //     return getAsync('/api/param-lookup/path-param-lookup/42').then((res: any) => {
  //       expect(res).toEqual('42')
  //     })
  //   })

  //   it('should look up a query param', () => {
  //     return getAsync('/api/param-lookup/query-param-lookup?value=42').then((res: any) => {
  //       expect(res).toEqual('42')
  //     })
  //   })

  //   it('should look up a header', () => {
  //     return postAsync('/api/param-lookup/header-lookup', 'body-contents', { 'some-header': '42' }).then((res: any) => {
  //       expect(res).toEqual('body-contents 42')
  //     })
  //   })

  //   it('should supply the request by default', () => {
  //     return getAsync('/api/param-lookup/default-lookup/asdf/foo').then((res: any) => {
  //       expect(res).toEqual('asdf foo')
  //     })
  //   })
  // })
  // describe('type conversion', () => {
  //   it('should convert a Boolean parameter', async () => {
  //     await postAsync('/api/type-conversion/booleans/true', 'true', { 'bool-header': 'true' }).then((res: any) => {
  //       expect(res).toEqual(JSON.stringify([true, true, true]))
  //     })

  //     await postAsync('/api/type-conversion/booleans/blah', false, { 'bool-header': 'false' }).then((res: any) => {
  //       expect(res).toEqual(JSON.stringify([false, false, false]))
  //     })
  //   })

  //   it('should convert a Number parameter', async () => {
  //     await postAsync('/api/type-conversion/numbers/1', '2', { 'num-header': '3' }).then((res: any) => {
  //       expect(res).toEqual(JSON.stringify([1, 2, 3]))
  //     })

  //     await postAsync('/api/type-conversion/numbers/foo', '2', { 'num-header': '3' }).then((res: any) => {
  //       sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert "foo" to number' } }))
  //       errorStub.reset()
  //     })

  //     await postAsync('/api/type-conversion/numbers/4', null, { 'num-header': '3' }).then((res: any) => {
  //       sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to number' } }))
  //       errorStub.reset()
  //     })

  //     await postAsync('/api/type-conversion/numbers/4', '2', {}).then((res: any) => {
  //       sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to number' } }))
  //       errorStub.reset()
  //     })
  //   })

  //   it('should convert a String parameter', async () => {
  //     await postAsync('/api/type-conversion/strings/one', 2, { 'string-header': 'three' }).then((res: any) => {
  //       expect(res).toEqual(JSON.stringify(['one', '2', 'three']))
  //     })

  //     await postAsync('/api/type-conversion/strings/one', null, { 'string-header': 'three' }).then((res: any) => {
  //       sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to string' } }))
  //       errorStub.reset()
  //     })

  //     await postAsync('/api/type-conversion/strings/one', 2, {}).then((res: any) => {
  //       sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to string' } }))
  //       errorStub.reset()
  //     })
  //   })

  //   it('should allow a custom type converter', () => {
  //     return getAsync('/api/type-conversion/custom/32').then((res: any) => {
  //       expect(res).toEqual(JSON.stringify(32))
  //     })
  //   })

  //   it('should allow a custom type converter based on type predicate', () => {
  //     return getAsync('/api/type-conversion/custom-predicate/64').then((res: any) => {
  //       expect(res).toEqual(JSON.stringify('predicate 64'))
  //     })
  //   })

  //   it('should throw an error if a type converter cannot be found for a type', () => {
  //     void 0
  //   })
  // })
})
