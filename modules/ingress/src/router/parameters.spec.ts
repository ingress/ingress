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

describe('Parameters', () => {
  let app: IngressApp,
    routeSpy: sinon.SinonSpy,
    path: (url: string) => string,
    errorStub: sinon.SinonStub,
    expectedResponse: string

  beforeEach(async () => {
    const onError = (ctx: any) => {
      //console.log('HERE', ctx)
      return errorStub(ctx)
    }
    errorStub = sinon.stub()
    app = ingress({ router: { baseUrl: 'base' }, onError })
    app.router
    routeSpy = sinon.spy()

    @app.Controller('route')
    class TestController {
      constructor() {
        routeSpy = sinon.spy()
      }
      @Route.Get('path/:expected')
      pathParam(@Route.Path('expected') result: string) {
        routeSpy()
        return expectedResponse
      }

      @Route.Get('query')
      queryParam(@Route.Query('expected') result: string) {
        routeSpy()
        return expectedResponse
      }

      @Route.Post('header')
      headerParam(@Route.Header('expected') result: string) {
        routeSpy()
        return expectedResponse
      }

      @Route.Post('type-conversion/booleans/:expected')
      typeConversionBool(
        @Route.Header('expected') h: boolean,
        @Route.Query('expected') q: boolean,
        @Route.Path('expected') p: boolean
      ) {
        routeSpy()
        return [h, q, p]
      }

      @Route.Post('type-conversion/numbers/:expected')
      typeConversionNumber(
        @Route.Header('expected') h: number,
        @Route.Body() b: number,
        @Route.Path('expected') p: number
      ) {
        routeSpy()
        return [p, b, h]
      }
    }
    expectedResponse = Math.random().toString()
    const portInfo = await getPort()
    await app.listen(+portInfo.port)
    path = portInfo.path
  })

  afterEach(() => {
    return app.close()
  })

  it('should look up a path param', async () => {
    const res = await getAsync(path('/base/route/path/' + expectedResponse))
    expect(res).toEqual(expectedResponse)
  })

  it('should look up a query param', async () => {
    const res = await getAsync(path('/base/route/query?expected=' + expectedResponse))
    expect(res).toEqual(expectedResponse)
  })

  it('should look up a header', async () => {
    const res = await postAsync(path('/base/route/header'), { headers: { expected: expectedResponse } })
    expect(res).toEqual(expectedResponse)
  })

  describe('Default type converters', () => {
    it('should convert a Boolean parameter', async () => {
      const res = await postAsync(path('/base/route/type-conversion/booleans/true?expected=true'), {
        headers: { expected: 'true' },
      })
      expect(JSON.parse(res)).toEqual([true, true, true])
      const res2 = await postAsync(path('/base/route/type-conversion/booleans/false?expected=false'), {
        headers: { expected: 'false' },
      })
      expect(JSON.parse(res2)).toEqual([false, false, false])
    })

    it('should convert a Number parameter', async () => {
      const res = await postAsync(path('/base/route/type-conversion/numbers/1'), {
        data: JSON.stringify(2),
        headers: { expected: '3' },
      })
      expect(JSON.parse(res)).toEqual([1, 2, 3])
      let error: Error | undefined = undefined
      try {
        await postAsync(path('/base/route/type-conversion/numbers/foo'), {
          data: JSON.stringify(2),
          headers: { expected: '3' },
        })
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
      sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert "foo" to number' } }))
    })
  })

  //   await postAsync('/api/type-conversion/numbers/4', null, { 'num-header': '3' }).then((res: any) => {
  //     sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to number' } }))
  //     errorStub.reset()
  //   })

  //   await postAsync('/api/type-conversion/numbers/4', '2', {}).then((res: any) => {
  //     sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to number' } }))
  //     errorStub.reset()
  //   })
  // })

  // it('should convert a String parameter', async () => {
  //   await postAsync('/api/type-conversion/strings/one', 2, { 'string-header': 'three' }).then((res: any) => {
  //     expect(res).toEqual(JSON.stringify(['one', '2', 'three']))
  //   })

  //   await postAsync('/api/type-conversion/strings/one', null, { 'string-header': 'three' }).then((res: any) => {
  //     sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to string' } }))
  //     errorStub.reset()
  //   })

  //   await postAsync('/api/type-conversion/strings/one', 2, {}).then((res: any) => {
  //     sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to string' } }))
  //     errorStub.reset()
  //   })
  // })

  // it('should allow a custom type converter', () => {
  //   return getAsync('/api/type-conversion/custom/32').then((res: any) => {
  //     expect(res).toEqual(JSON.stringify(32))
  //   })
  // })

  // it('should allow a custom type converter based on type predicate', () => {
  //   return getAsync('/api/type-conversion/custom-predicate/64').then((res: any) => {
  //     expect(res).toEqual(JSON.stringify('predicate 64'))
  //   })
  // })

  it('should throw an error if a type converter cannot be found for a type', () => {
    void 0
  })
})
