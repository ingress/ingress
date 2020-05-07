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

  class MyType {
    static convert(value: any) {
      return new MyType(value)
    }
    constructor(public value: any) {}
  }

  class PredicateType {
    static convert(value: any) {
      return new PredicateType('predicate ' + value)
    }
    constructor(public value: any) {}
  }

  beforeEach(async () => {
    const onError = (ctx: any) => {
      //console.log('ERROR', ctx.error)
      return errorStub(ctx)
    }
    errorStub = sinon.stub()
    app = ingress({
      router: { baseUrl: 'base' },
      onError,
    })
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
      @Route.Post('type-conversion/strings/:expected')
      typeConversionString(
        @Route.Header('expected') h: string,
        @Route.Body() b: string,
        @Route.Path('expected') p: string
      ) {
        routeSpy()
        return [p, b, h]
      }
      @Route.Get('type-conversion/custom/:expected')
      typeConversionCustom(@Route.Path('expected') p: MyType) {
        routeSpy()
        expect(p).toBeInstanceOf(MyType)
        return p
      }
      @Route.Get('/type-conversion/custom-predicate/:expected')
      typeConversionCustomPredicate(@Route.Path('expected') p: PredicateType) {
        routeSpy()
        expect(p).toBeInstanceOf(PredicateType)
        return p
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

      try {
        await postAsync(path('/base/route/type-conversion/booleans/wat'))
      } catch (e) {
        expect(e.statusMessage).toEqual('Bad Request')
        expect(e.statusCode).toEqual(400)
      }
      sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to boolean' } }))
    })

    it('should convert a Number parameter', async () => {
      const res = await postAsync(path('/base/route/type-conversion/numbers/1'), {
        data: JSON.stringify(2),
        headers: { expected: '3' },
      })
      expect(JSON.parse(res)).toEqual([1, 2, 3])

      try {
        await postAsync(path('/base/route/type-conversion/numbers/foo'), {
          data: JSON.stringify(2),
          headers: { expected: '3' },
        })
      } catch (e) {
        expect(e.statusMessage).toEqual('Bad Request')
        expect(e.statusCode).toEqual(400)
      }
      sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert "foo" to number' } }))

      try {
        await postAsync(path('/base/route/type-conversion/numbers/4'), {
          data: null,
          headers: { expected: '3' },
        })
      } catch (e) {
        expect(e.statusMessage).toEqual('Bad Request')
        expect(e.statusCode).toEqual(400)
      }
      sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to number' } }))

      try {
        await postAsync(path('/base/route/type-conversion/numbers/4'), { data: '2' })
      } catch (e) {
        expect(e.statusMessage).toEqual('Bad Request')
        expect(e.statusCode).toEqual(400)
      }
      sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to number' } }))
    })
  })

  it('should convert a String parameter', async () => {
    const res = await postAsync(path('/base/route/type-conversion/strings/one'), {
      data: 2,
      headers: { expected: 'three' },
    })
    expect(res).toEqual(JSON.stringify(['one', '2', 'three']))

    try {
      await postAsync(path('/base/route/type-conversion/strings/one'), {
        data: null,
        headers: { expected: 'three' },
      })
    } catch (e) {
      expect(e.statusMessage).toEqual('Bad Request')
      expect(e.statusCode).toEqual(400)
    }
    sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to string' } }))

    try {
      await postAsync(path('/base/route/type-conversion/strings/one'))
    } catch (e) {
      expect(e.statusMessage).toEqual('Bad Request')
      expect(e.statusCode).toEqual(400)
    }
    sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to string' } }))
  })

  it('should allow a custom type converter', async () => {
    const res = await getAsync(path('/base/route/type-conversion/custom/asdf'))
    expect(res).toEqual(JSON.stringify(new MyType('asdf')))
  })

  it('should allow a custom type converter based on type predicate', async () => {
    const res = await getAsync(path('/base/route/type-conversion/custom-predicate/64'))
    expect(res).toEqual(JSON.stringify(new PredicateType('predicate 64')))
  })

  it('should throw an error if a type converter cannot be determined for a type', async () => {
    class SomeType {}
    let error: Error | undefined = undefined
    class Routes {
      @Route.Get('somepath/:something')
      somepath(@Route.Path('something') p: SomeType) {
        return p
      }
    }
    try {
      await ingress({
        router: {
          routes: [Routes],
        },
      }).listen()
    } catch (e) {
      error = e
    }
    //reflective error message
    expect(error?.message).toEqual('No type converter found for: Routes.somepath at parameter 0:SomeType')
  })
})
