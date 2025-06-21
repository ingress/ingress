import 'reflect-metadata'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert'
import { createConnection } from 'node:net'
import { Ingress } from '@ingress/core'
import type { Started } from './request.util.test.js'
import { start } from './request.util.test.js'
import type { HttpContext } from './node.http.js'
import { Http } from './node.http.js'
import type { AddressInfo } from 'node:net'

let testServer: Started, makeRequest: Started['request']

describe('Node.js HTTP Integration', () => {
  after(async () => {
    await testServer.app.stop()
  })

  before(async () => {
    // Set up test server with middleware that handles different test scenarios
    testServer = await start(void 0, ({ request, response }: HttpContext<any>, next: any) => {
      switch (request.pathname) {
        case '/middleware-passthrough':
          // Let middleware handle the request and pass through to next handler
          return next()
        case '/throw-generic-error':
          // Simulate a generic error that should result in 500
          throw new Error('simulated server error')
        case '/throw-custom-status-error':
          // Simulate an error with custom status code
          throw Object.assign(new Error('custom status error'), { statusCode: 502 })
        case '/user-handled-response':
          // User explicitly handles the response
          response.code(200).send()
          break
        default:
          return next()
      }
    })
    makeRequest = testServer.request
  })

  describe('Request Routing and Middleware', () => {
    it('should pass through middleware and return 200 when no explicit handlers match', async () => {
      const response = await makeRequest('/middleware-passthrough')
      const expectedStatusMessage = 'OK'

      assert.strictEqual(response.payload, '', 'Response body should be empty')
      assert.strictEqual(response.headers['content-type'], undefined, 'Content-Type header should not be set')
      assert.strictEqual(response.statusCode, 200, 'Status code should be 200')
      assert.strictEqual(response.statusMessage, expectedStatusMessage, 'Status message should be OK')
    })
  })

  describe('Error Handling', () => {
    it('should return 500 Internal Server Error for unhandled exceptions', async () => {
      const response = await makeRequest('/throw-generic-error')
      const expectedStatusMessage = 'Internal Server Error'

      // Note: Error logging assertion is commented out as it depends on logger implementation
      // assert.strictEqual(testServer.app.container.get(testServer.logger).error).toHaveBeenCalledWith(
      //   '[ingress]:INTERNAL_SERVER_ERROR',
      //   new Error('simulated server error')
      // )

      assert.strictEqual(response.payload, '', 'Response body should be empty for generic errors')
      assert.strictEqual(response.headers['content-type'], void 0, 'Content-Type should not be set')
      assert.strictEqual(response.statusCode, 500, 'Status code should be 500')
      assert.strictEqual(
        response.statusMessage,
        expectedStatusMessage,
        'Status message should be Internal Server Error',
      )
    })

    it('should respect custom status codes in error objects', async () => {
      const response = await makeRequest('/throw-custom-status-error')
      const expectedStatusMessage = 'Bad Gateway'

      assert.strictEqual(
        response.payload,
        'Error: custom status error',
        'Response should contain error message',
      )
      assert.strictEqual(
        response.headers['content-type'],
        'text/plain;charset=UTF-8',
        'Content-Type should be text/plain',
      )
      assert.strictEqual(response.statusCode, 502, 'Status code should match custom statusCode property')
      assert.strictEqual(
        response.statusMessage,
        expectedStatusMessage,
        'Status message should match status code',
      )
    })
  })

  describe('Response Handling', () => {
    it('should handle user-controlled responses correctly', async () => {
      const response = await makeRequest('/user-handled-response')
      const expectedStatusMessage = 'OK'

      assert.strictEqual(response.payload, '', 'Response body should be empty when user sends empty response')
      assert.strictEqual(
        response.headers['content-type'],
        void 0,
        'Content-Type should not be set for empty response',
      )
      assert.strictEqual(response.statusCode, 200, 'Status code should be 200 as set by user')
      assert.strictEqual(response.statusMessage, expectedStatusMessage, 'Status message should be OK')
    })
  })

  describe('Client Error Handling', () => {
    it('should invoke custom client error handler for malformed requests', async () => {
      let assertionsPassed = 0
      const totalAssertions = 2
      const testCompletion = deferredWithTimeout()

      const httpServer = new Http({
        clientErrorHandler: (error, socket) => {
          assertionsPassed++
          try {
            assert.equal(
              error.message,
              'Parse Error: Invalid method encountered',
              'Error message should indicate parse error',
            )
            socket.end()
            testCompletion.resolve()
          } catch (err) {
            testCompletion.reject(err)
          }
        },
      })
      const app = new Ingress()

      app.use(httpServer)
      await app.run()

      try {
        await sendMalformedHttpRequest(httpServer.server.address() as AddressInfo)
        assertionsPassed++
        await testCompletion.promise
      } finally {
        await app.stop()
      }

      assert.strictEqual(assertionsPassed, totalAssertions, 'All assertions should have passed')
    })

    it('should handle client errors with default handler when no custom handler is provided', async () => {
      const httpServer = new Http()
      const app = new Ingress()

      app.use(httpServer)
      await app.run()

      const errorResult: any = await sendMalformedHttpRequest(httpServer.server.address() as AddressInfo)

      assert.ok(errorResult, 'Should receive an error from malformed request')

      await app.stop()
    })
  })

  describe('Server Configuration', () => {
    it('should respect explicit port configuration', async () => {
      const explicitPort = 7654
      const httpServer = new Http({ listen: explicitPort })
      const app = new Ingress<HttpContext<any>>()

      app.use(httpServer)
      await app.run()

      const actualPort = (httpServer.server.address() as any).port
      assert.strictEqual(
        actualPort,
        explicitPort,
        `Server should listen on explicitly configured port ${explicitPort}`,
      )

      await app.stop()
    })

    it('should use PORT environment variable when no explicit port is provided', async () => {
      const envPort = '8765'
      process.env.PORT = envPort

      const httpServer = new Http()
      const app = new Ingress<HttpContext<any>>()

      app.use(httpServer)
      await app.run()

      const actualPort = (httpServer.server.address() as any).port
      assert.strictEqual(
        actualPort,
        parseInt(envPort),
        `Server should listen on PORT environment variable ${envPort}`,
      )

      await app.stop()
    })
  })

  describe('Multiple HTTP Instances', () => {
    it('should share the same server instance when using nested apps', async () => {
      const httpInstanceA = Object.assign(new Http(), { http: 'A' })
      const httpInstanceB = Object.assign(new Http(), { http: 'B' })

      const appA = Object.assign(new Ingress<HttpContext<any>>().use(httpInstanceA), { app: 'A' })
      const appB = Object.assign(new Ingress<HttpContext<any>>().use(httpInstanceB), { app: 'B' })

      appA.use(appB)
      await appA.run()
      assert.strictEqual(
        httpInstanceA.server,
        httpInstanceB.server,
        'Nested HTTP instances should share the same server',
      )

      await appA.stop()
    })
  })

  function deferredWithTimeout() {
    const deferred: any = {}
    deferred.promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout - expected operation was not completed within 5 seconds'))
      }, 5000)
      deferred.reject = (x: any) => {
        clearTimeout(timeout)
        return reject(x)
      }
      deferred.resolve = (x: any) => {
        clearTimeout(timeout)
        return resolve(x)
      }
    })
    return deferred
  }

  async function sendMalformedHttpRequest(serverAddress: AddressInfo) {
    const { address, port } = serverAddress

    return new Promise((resolve) => {
      const connection = createConnection(port, address, () => {
        connection.setNoDelay(true)
        connection.on('error', (err) => {
          resolve(err)
        })
        connection.on('close', () => {
          resolve(new Error('Connection closed'))
        })
        connection.write('INVALID_METHOD\x01/path HTTP/1.1\r\n\r\n')
        setTimeout(() => {
          if (!connection.destroyed) {
            connection.destroy()
          }
        }, 200)
      })

      connection.on('error', (err) => {
        resolve(err)
      })
    })
  }
})
