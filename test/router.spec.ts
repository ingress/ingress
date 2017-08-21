import { Server, DefaultMiddleware } from '@ingress/core'
import { createAnnotationFactory } from 'reflect-annotations'
import * as sinon from 'sinon'
import { getAsync as get, postAsync as post } from './util/http'
import { expect } from 'chai'
import {
  Route,
  Router,
  BaseRouterContext,
  ParseBody,
  Param
} from '../src'

const getAsync = (url:string) => get(`http://localhost:8888${url}`),
  postAsync = (url: string, payload: any, headers?: any) => post(`http://localhost:8888${url}`, payload, headers)
let expectedBody: any, expectedQuery: any, expectedParams: any, expectedResponse: any, router: any = null

class MyContext extends BaseRouterContext<MyContext> {}

class MyCustomType {
  constructor(public value: number) { }
}

class MyUnknownType { }

describe('Routing', () => {
  let server: Server<MyContext>,
    router: Router<MyContext>,
    routeSpy: sinon.SinonSpy,
    orderedSpys: sinon.SinonSpy[],
    errorStub: sinon.SinonStub

  beforeEach(() => {
    server = new Server<MyContext>()
      .use(new DefaultMiddleware<MyContext>({ onError: errorStub = sinon.stub() }))
    router = new Router<MyContext>({
      baseUrl: 'api',
      resolveController: (_:any, C: any) => new C(routeSpy = sinon.spy(() => expectedResponse)),
      typeConverters: [
        {
          type: MyCustomType,
          convert: value => new MyCustomType(+value)
        }
      ]
    })
    orderedSpys = Array.from(Array(3)).map(x => sinon.spy())

    const [One, Two, Three] = orderedSpys.map(x => {
      return createAnnotationFactory(class {
        middleware (_:any, next: any) {
          return next(x())
        }
      })
    })

    const { Controller } = router

    @Controller('test')
    class TestController {
      constructor (public spy: Function) {}
      @Route.Get('route')
      a (...args: any[]) {
        return this.spy(...args)
      }
      @Route.Get('$/route')
      b (...args: any[]) {
        return this.spy(...args)
      }
      @Route('~/route', Route.Get, Route.Post)
      c (...args: any[]) {
        return this.spy(...args)
      }

      @Route.Get('ordered-middleware')
      @One()
      @Two()
      @Three()
      d (...args: any[]) {
        return this.spy(...args)
      }

      @Route.Get()
      e (...args: any[]) {
        return this.spy(...args)
      }
    }

    @Controller
    class TestController2 {
      constructor (public spy: Function) {}
      @Route.Post('/abc/:a/:b/:c')
      postAsdf ({ body, query, params }: any) {
        expect(body).to.eql(expectedBody)
        expect(query).to.eql(expectedQuery)
        expect(params).to.eql(expectedParams)
        return expectedResponse
      }
      @ParseBody({ parse: false, output: 'data' })
      @Route.Post('test-buffer')
      postTestBuffer ({ body }: any): any {
        this.spy()
        expect(Buffer.isBuffer(body)).to.be.true
        return null
      }
    }

    @Controller('param-lookup')
    class ParamLookup {
      @Route.Post('body-lookup')
      bodyParamLookup (@Param.Body() data: any) {
        return data
      }

      @Route.Get('path-param-lookup/:id')
      pathParamLookup (@Param.Path('id') id: string) {
        return id
      }

      @Route.Get('query-param-lookup')
      queryParamLookup (@Param.Query('value') value: string) {
        return value
      }

      @Route.Post('header-lookup')
      headerLookup (@Param.Body() body: string, @Param.Header('some-header') value: number) {
        return body + ' ' + value
      }

      @Route.Get('default-lookup/:a/:b')
      defaultRequestLookup ({ params: { a } }: any, @Param.Path('b') b: string) {
        return a + ' ' + b
      }
    }

    @Controller('type-conversion')
    class TypeConversion {
      @Route.Post('booleans/:b1')
      booleanConversion(@Param.Path('b1') path: boolean, @Param.Body() body: boolean, @Param.Header('bool-header') header: boolean) {
        return JSON.stringify([path, body, header])
      }

      @Route.Post('numbers/:n1')
      numberConversion(@Param.Path('n1') path: number, @Param.Body() body: number, @Param.Header('num-header') header: number) {
        return JSON.stringify([path, body, header])
      }

      @Route.Post('strings/:s1')
      stringConversion(@Param.Path('s1') path: string, @Param.Body() body: string, @Param.Header('string-header') header: string) {
        return JSON.stringify([path, body, header])
      }

      @Route.Get('custom/:value')
      customTypeConversion(@Param.Path('value') custom: MyCustomType) {
        return JSON.stringify(custom.value)
      }
    }

    server.use(router)
    return server.listen(8888)
  })

  afterEach(() => {
    try {
      sinon.assert.notCalled(errorStub)
    } catch (err) {
      const lastError = errorStub.lastCall.args[0]
      if(lastError && lastError.error) {
        throw lastError.error
      }
      throw err
    }
    return server.close()
  })

  it('should route', async () => {
    expectedResponse = 'Hello World'
    const response = await getAsync('/api/test/route')
    expect(response).to.equal(expectedResponse)
    sinon.assert.calledOnce(routeSpy)
  })

  it('should call middleware in order', async () => {
    const response = await getAsync('/api/test/ordered-middleware')
    sinon.assert.callOrder(...orderedSpys)
  })

  it('$ should ignore all route prefixes', async () => {
    expectedResponse = Math.random().toString()
    const response = await getAsync('/route')
    expect(response).to.equal(expectedResponse)
  })

  it('~ should ignore parent route prefixes', async () => {
    expectedResponse = Math.random().toString()
    const response = await getAsync('/api/route')
    expect(response).to.equal(expectedResponse)
  })

  it('should register multiple methods', async () => {
    expectedResponse = Math.random().toString()
    const res1 = await getAsync('/api/route')
    const res2 = await postAsync('/api/route', {})
    expect(res1 === res2).to.be.true
    expect(res1).to.equal(expectedResponse)
  })

  it('should allow empty paths', async () => {
    expectedResponse = Math.random().toString()
    const response = await getAsync('/api/test/route')
    expect(response).to.equal(expectedResponse)
  })

  it('should resolve a controller for each request', async () => {
    expectedResponse = Math.random().toString()
    await getAsync('/api/route')
    const oldSpy = routeSpy
    await getAsync('/api/route')
    expect(oldSpy).to.not.equal(routeSpy)
  })

  it('should parse the body, query and route parameters', async () => {
    expectedQuery = { a: 'b', b: 'c' }
    expectedParams = { a: '1', b: '2', c: '3' }
    expectedBody = { hello: 'world' }

    const response = await postAsync('/api/abc/1/2/3?a=b&b=c', expectedBody)
    expect(response).to.equal(expectedResponse)
  })

  it('should return 404 for missing routes', async () => {
    expect(await getAsync('/api/missing')).to.equal('Not Found')
  })

  it('should allow a custom body parser', () => {
    return postAsync('/api/test-buffer', { 'data': 'asdf' }).then(() => {
      sinon.assert.calledOnce(routeSpy)
    })
  })

  describe('parameter lookup', () => {
    it('should look up a body param', () => {
      return postAsync('/api/param-lookup/body-lookup', 'content').then((res) => {
        expect(res).to.eql('content')
      })
    })

    it('should look up a path param', () => {
      return getAsync('/api/param-lookup/path-param-lookup/42').then((res) => {
        expect(res).to.eql('42')
      })
    })

    it('should look up a query param', () => {
      return getAsync('/api/param-lookup/query-param-lookup?value=42').then((res) => {
        expect(res).to.eql('42')
      })
    })

    it('should look up a header', () => {
      return postAsync('/api/param-lookup/header-lookup', 'body-contents', { 'some-header': '42' }).then((res) => {
        expect(res).to.eql('body-contents 42')
      })
    })

    it('should supply the request by default', () => {
      return getAsync('/api/param-lookup/default-lookup/asdf/foo').then((res) => {
        expect(res).to.eql('asdf foo')
      })
    })
  })
  describe('type conversion', () => {
    it('should convert a Boolean parameter', async() => {
      await postAsync('/api/type-conversion/booleans/true', 'true', { 'bool-header' : 'true' }).then((res) => {
        expect(res).to.eql(JSON.stringify([true, true, true]))
      })

      await postAsync('/api/type-conversion/booleans/blah', false, { 'bool-header' : 'false' }).then((res) => {
        expect(res).to.eql(JSON.stringify([false, false, false]))
      })
    })

    it('should convert a Number parameter', async() => {
      await postAsync('/api/type-conversion/numbers/1', '2', { 'num-header' : '3' }).then((res) => {
        expect(res).to.eql(JSON.stringify([1, 2, 3]))
      })

      await postAsync('/api/type-conversion/numbers/foo', '2', { 'num-header' : '3' }).then((res) => {
        sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert "foo" to number' } }))
        errorStub.reset()
      })

      await postAsync('/api/type-conversion/numbers/4', null, { 'num-header' : '3' }).then((res) => {
        sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to number' } }))
        errorStub.reset()
      })

      await postAsync('/api/type-conversion/numbers/4', '2', {}).then((res) => {
        sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to number' } }))
        errorStub.reset()
      })
    })

    it('should convert a String parameter', async() => {
      await postAsync('/api/type-conversion/strings/one', 2, { 'string-header' : 'three' }).then((res) => {
        expect(res).to.eql(JSON.stringify(['one', '2', 'three']))
      })

      await postAsync('/api/type-conversion/strings/one', null, { 'string-header' : 'three' }).then((res) => {
        sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert null to string' } }))
        errorStub.reset()
      })

      await postAsync('/api/type-conversion/strings/one', 2, {}).then((res) => {
        sinon.assert.calledWith(errorStub, sinon.match({ error: { message: 'cannot convert undefined to string' } }))
        errorStub.reset()
      })
    })

    it('should allow a custom type converter', () => {
      return getAsync('/api/type-conversion/custom/32').then((res) => {
        expect(res).to.eql(JSON.stringify(32))
      })
    })

    it('should throw an error if a type converter cannot be found for a type', () => {
      const badRouter = new Router<MyContext>({}),
        { Controller: ExpectToFail } = badRouter

      @ExpectToFail
      class UnknownCustomType {
        @Route.Get('custom-unknown/:value')
        failedTypeConversion(@Param.Path('value') value: MyUnknownType) {
          return JSON.stringify([value])
        }
      }

      try {
        new Server().use(badRouter.middleware)
        expect.fail()
      } catch (err) {
        expect(err.message).to.eql('no type converter found for type: MyUnknownType')
      }
    })
  })
})
