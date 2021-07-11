/* eslint-disable @typescript-eslint/no-unused-vars */
import ingress, { IngressApp } from '../app.js'
import { Route } from './router.js'
import * as sinon from 'sinon'
import Websocket from 'ws'
import getPortAsync from 'get-port'
import { getAsync, postAsync } from './test.util.spec.js'
import { createAnnotationFactory } from 'reflect-annotations'
import type { UpgradeBody } from '../websocket/upgrade.js'
import { StatusCode } from '@ingress/http-status'

async function getPort() {
  const port = await getPortAsync()
  return {
    port,
    path(uri: string, protocol = 'http') {
      return `${protocol}://localhost:${port}${uri}`
    },
  }
}

describe('Routing', () => {
  let app: IngressApp,
    routeSpy: sinon.SinonSpy,
    orderedSpies: sinon.SinonSpy[],
    singleStart = false,
    singleStop = false,
    singleMiddle = false,
    path: (url: string, protocol?: string) => string,
    // errorStub: sinon.SinonStub,
    expectedResponse: string

  beforeEach(async () => {
    app = ingress({
      router: { baseUrl: 'base' },
    })
    app.router
    routeSpy = sinon.spy()
    orderedSpies = Array.from(Array(2), () => sinon.spy())

    const M1 = createAnnotationFactory(
        class {
          middleware(_: any, next: any) {
            orderedSpies[0]()
            return next()
          }
        }
      ),
      M2 = createAnnotationFactory(
        class {
          middleware(_: any, next: any) {
            orderedSpies[1]()
            return next()
          }
        }
      )

    @app.Controller()
    class WebsocketController {
      @Route.Upgrade('something')
      async handleUpgrade(@Route.Body() body: UpgradeBody) {
        await body.accept()
      }
      @Route.Upgrade('something/rejectMe')
      async handleRejectUpgrade(@Route.Body() body: UpgradeBody) {
        body.reject()
      }
      @Route.Upgrade('something/unhandled')
      async unhandledUpgrade(@Route.Body() body: UpgradeBody) {
        void body
      }
      @Route.Upgrade('something/forbidden')
      async handleForbiddenUpgrade(@Route.Body() body: UpgradeBody) {
        body.reject(StatusCode.Forbidden)
      }
      @Route.Upgrade('something/$money/:variable')
      async handleRouteVariable(
        @Route.Path('variable') something: string,
        @Route.Body() body: UpgradeBody
      ) {
        routeSpy(something)
        await body.accept()
      }
    }
    @app.Controller('route')
    class TestController {
      constructor() {
        routeSpy = sinon.spy()
      }
      @Route.Get()
      empty() {
        return expectedResponse
      }
      @M1()
      @M2()
      @Route.Get('test', Route.Post, Route.Put)
      someRoute() {
        routeSpy()
        return expectedResponse
      }
      @Route.Get('$test')
      localPrefix() {
        routeSpy()
        return expectedResponse
      }
      @Route.Get('~test')
      globalPrefix() {
        routeSpy()
        return expectedResponse
      }
      @Route.Get('/:something/$money', Route.Post, Route.Put)
      specialURICharacter() {
        routeSpy()
        return expectedResponse
      }

      @Route.Parse()
      @Route.Post('/test-buffer')
      assertBuffer(@Route.Body() body: typeof Buffer) {
        expect(Buffer.isBuffer(body)).toBeTruthy()
        routeSpy()
        return expectedResponse
      }

      @Route.Post('parameterized/:a/:b/:c')
      parameterized(
        @Route.Query() query: Record<string, any>,
        @Route.Path() path: Record<string, any>,
        @Route.Body() body: Record<string, any>
      ) {
        return {
          body: body,
          params: path,
          query: query,
        }
      }
    }
    @app.UseSingleton
    class autoregisteredSingleton {
      middleware(context: any, next: any) {
        singleMiddle = true
        return next()
      }
      start() {
        singleStart = true
      }
      stop() {
        singleStop = true
      }
    }

    const portInfo = await getPort()
    await app.listen(+portInfo.port)
    path = portInfo.path
  })

  afterEach(() => app.close())

  it('should route', async () => {
    expectedResponse = 'Hello World'
    const getResponse = await getAsync(path('/base/route/test'))
    expect(getResponse).toEqual(expectedResponse)
    sinon.assert.calledOnce(routeSpy)
  })

  it('should collect and register singletons', async () => {
    expectedResponse = 'Hello World'
    const getResponse = await getAsync(path('/base/route/test'))
    expect(getResponse).toEqual(expectedResponse)
    expect([singleStart, singleMiddle, singleStart]).toEqual([true, true, true])
  })

  it('should allow a websocket connection', async () => {
    const url = path('/base/something', 'ws'),
      socket = new Websocket(url)
    while (socket.readyState !== Websocket.OPEN) {
      await new Promise((res) => setTimeout(res, 100))
    }
    socket.close()
  })

  it('should enable denying a websocket connection', async () => {
    const url = path('/base/something/rejectMe', 'ws'),
      socket = new Websocket(url),
      error: Error = await new Promise((resolve) => {
        socket.on('error', resolve)
      })
    expect(error.message).toEqual('Unexpected server response: 404')
    socket.close()
  })

  it('should 404 a websocket connection if the upgrade route does not handle it', async () => {
    const url = path('/base/something/unhandled', 'ws'),
      socket = new Websocket(url),
      error: Error = await new Promise((resolve) => {
        socket.on('error', resolve)
      })
    expect(error.message).toEqual('Unexpected server response: 404')
    socket.close()
  })

  it('should enable denying a websocket connection with a code', async () => {
    const url = path('/base/something/forbidden', 'ws'),
      socket = new Websocket(url),
      error: Error = await new Promise((resolve) => {
        socket.on('error', resolve)
      })
    expect(error.message).toEqual('Unexpected server response: 403')
    socket.close()
  })

  it('should work with route input', async () => {
    const expectedInput = Math.random().toString(36).slice(2),
      url = path(`/base/something/$money/${expectedInput}`, 'ws'),
      socket = new Websocket(url)
    while (socket.readyState !== Websocket.OPEN) {
      await new Promise((res) => setTimeout(res, 100))
    }
    sinon.assert.calledWith(routeSpy, expectedInput)
    socket.close()
  })

  it('should route with special characters', async () => {
    expectedResponse = 'Hello World'
    const getResponse = await getAsync(path('/base/route/something/$money'))
    expect(getResponse).toEqual(expectedResponse)
    sinon.assert.calledOnce(routeSpy)
  })

  it('should call middleware in order', async () => {
    expectedResponse = 'Hello World'
    await getAsync(path('/base/route/test'))
    sinon.assert.callOrder(...orderedSpies)
  })

  it('$ should ignore all route prefixes', async () => {
    expectedResponse = Math.random().toString()
    const response = await getAsync(path('/base/test'))
    expect(response).toEqual(expectedResponse)
  })

  it('~ should ignore parent route prefixes', async () => {
    expectedResponse = Math.random().toString()
    const response = await getAsync(path('/test'))
    expect(response).toEqual(expectedResponse)
  })

  it('should register multiple methods', async () => {
    expectedResponse = Math.random().toString()
    const res1 = await getAsync(path('/base/route/test'))
    sinon.assert.calledOnce(routeSpy)
    const res2 = await postAsync(path('/base/route/test'), {})
    expect(res1 === res2).toBe(true)
    sinon.assert.calledOnce(routeSpy)
  })

  it('should allow empty paths', async () => {
    expectedResponse = Math.random().toString()
    const response = await getAsync(path('/base/route'))
    expect(response).toEqual(expectedResponse)
  })

  it('should resolve a controller for each request', async () => {
    expectedResponse = Math.random().toString()
    await getAsync(path('/base/route'))
    const oldSpy = routeSpy
    await getAsync(path('/base/route'))
    expect(oldSpy !== routeSpy).toBeTruthy()
  })

  it('should parse the body, query and route parameters', async () => {
    const expectedQuery = { a: 'b', b: 'c' },
      expectedParams = { a: '1', b: '2', c: '3' },
      expectedBody = { hello: 'world' },
      response = await postAsync(path('/base/route/parameterized/1/2/3?a=b&b=c'), {
        data: expectedBody,
      })

    expect(JSON.parse(response)).toEqual({
      body: expectedBody,
      params: expectedParams,
      query: expectedQuery,
    })
  })

  it('should return 404 for missing routes', async () => {
    try {
      await getAsync(path('/missing'))
    } catch (e) {
      expect(e.statusMessage).toEqual('Not Found')
      expect(e.statusCode).toEqual(404)
      expect(e.body).toEqual('')
      return
    }
    throw new Error('Test Failed')
  })

  it('should allow a custom body parser', async () => {
    await postAsync(path('/base/route/test-buffer'), { data: 'hello' })
    sinon.assert.calledOnce(routeSpy)
  })
})
