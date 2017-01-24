import { Server, DefaultMiddleware } from 'ingress'
import * as sinon from 'sinon'
import { getAsync as get, postAsync as post } from './util/http'
import { expect } from 'chai'
import {
  Route,
  Router,
  BaseRouterContext,
  ParseBody
} from '../src'

const getAsync = (url:string) => get(`http://localhost:8888${url}`),
  postAsync = (url: string, payload: any) => post(`http://localhost:8888${url}`, payload)
let expectedBody: any, expectedQuery: any, expectedParams: any, expectedResponse: any, router: any = null

class MyContext extends BaseRouterContext<MyContext> {}

describe('Routing', () => {
  let server: Server<MyContext>,
    router: Router<MyContext>,
    routeSpy: sinon.SinonSpy,
    errorStub: sinon.SinonStub

  beforeEach(() => {
    server = new Server<MyContext>()
      .use(new DefaultMiddleware<MyContext>({ onError: errorStub = sinon.stub() }))
    router = new Router<MyContext>({
      baseUrl: 'api',
      resolveController: (_:any, C: any) => new C(routeSpy = sinon.spy(() => expectedResponse))
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
    server.use(router)
    return server.listen(8888)
  })

  afterEach(() => {
    sinon.assert.notCalled(errorStub)
    return server.close()
  })

  it("should route", async () => {
    expectedResponse = 'Hello World'
    const response = await getAsync('/api/test/route')
    expect(response).to.equal(expectedResponse)
    sinon.assert.calledOnce(routeSpy)
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

  it('should resolve a controller for each request', async () => {
    expectedResponse = Math.random().toString()
    await getAsync('/api/route')
    const oldSpy = routeSpy
    await getAsync('/api/route')
    expect(oldSpy).to.not.equal(routeSpy)
  })

  it('should parse the body, query and route parameters', async () => {
    expectedQuery = { a: 'b', b: 'c'}
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
})
