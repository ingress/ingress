import 'reflect-metadata'
import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { inject } from '@hapi/shot'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { Route } from './annotations/route.annotation.js'
import type { RouterContext } from './router.js'
import { Router, kIngressRouterTest, kIngressRouterTestPass } from './router.js'

describe('route overloading with symbol-based testing', () => {
  describe('parameter validation and handler execution', () => {
    it('should test parameters before executing handlers', async () => {
      let handler1ExecutionCount = 0
      let handler2ExecutionCount = 0
      let handler3ExecutionCount = 0

      // Create a type that only accepts numbers
      class MyNumberType {
        static [kIngressRouterTest](value: string): symbol {
          const num = Number(value)
          return !isNaN(num) ? kIngressRouterTestPass : Symbol('not-number')
        }
        static [Symbol.for('ingress:router:parse')](value: string): number {
          return Number(value)
        }
      }

      // Create a type that only accepts strings starting with 'str'
      class StringPrefix {
        static [kIngressRouterTest](value: string): symbol {
          return value.startsWith('str') ? kIngressRouterTestPass : Symbol('not-prefix')
        }
        static [Symbol.for('ingress:router:parse')](value: string): string {
          return value
        }
      }

      // Create a type that only accepts UUIDs
      class UUIDType {
        static [kIngressRouterTest](value: string): symbol {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          return uuidRegex.test(value) ? kIngressRouterTestPass : Symbol('not-uuid')
        }
        static [Symbol.for('ingress:router:parse')](value: string): string {
          return value
        }
      }

      class Routes {
        @Route.Get('/test/:id')
        handleNumeric(@Route.Param('id') id: MyNumberType) {
          handler1ExecutionCount++
          return { type: 'numeric', id, executionCount: handler1ExecutionCount }
        }

        @Route.Get('/test/:id')
        handleString(@Route.Param('id') id: StringPrefix) {
          handler2ExecutionCount++
          return { type: 'string', id, executionCount: handler2ExecutionCount }
        }

        @Route.Get('/test/:id')
        handleUUID(@Route.Param('id') id: UUIDType) {
          handler3ExecutionCount++
          return { type: 'uuid', id, executionCount: handler3ExecutionCount }
        }
      }

      const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
      await app.start()

      // Test numeric value - should only execute handler1
      const numericResult = await inject(app.driver, {
        method: 'GET',
        url: '/test/123',
      })
      assert.strictEqual(numericResult.statusCode, 200)
      const numericResponse = JSON.parse(numericResult.payload)
      assert.strictEqual(numericResponse.type, 'numeric')
      assert.strictEqual(numericResponse.id, 123)
      assert.strictEqual(handler1ExecutionCount, 1)
      assert.strictEqual(handler2ExecutionCount, 0)
      assert.strictEqual(handler3ExecutionCount, 0)

      // Reset counters for next test
      handler1ExecutionCount = 0
      handler2ExecutionCount = 0
      handler3ExecutionCount = 0

      // Test string value - should only execute handler2
      const stringResult = await inject(app.driver, {
        method: 'GET',
        url: '/test/str-example',
      })
      assert.strictEqual(stringResult.statusCode, 200)
      const stringResponse = JSON.parse(stringResult.payload)
      assert.strictEqual(stringResponse.type, 'string')
      assert.strictEqual(stringResponse.id, 'str-example')
      assert.strictEqual(handler1ExecutionCount, 0)
      assert.strictEqual(handler2ExecutionCount, 1)
      assert.strictEqual(handler3ExecutionCount, 0)

      // Reset counters for next test
      handler1ExecutionCount = 0
      handler2ExecutionCount = 0
      handler3ExecutionCount = 0

      // Test UUID value - should only execute handler3
      const uuidResult = await inject(app.driver, {
        method: 'GET',
        url: '/test/550e8400-e29b-41d4-a716-446655440000',
      })
      assert.strictEqual(uuidResult.statusCode, 200)
      const uuidResponse = JSON.parse(uuidResult.payload)
      assert.strictEqual(uuidResponse.type, 'uuid')
      assert.strictEqual(uuidResponse.id, '550e8400-e29b-41d4-a716-446655440000')
      assert.strictEqual(handler1ExecutionCount, 0)
      assert.strictEqual(handler2ExecutionCount, 0)
      assert.strictEqual(handler3ExecutionCount, 1)
    })

    it('should return 404 when all parameter validations fail', async () => {
      // Create types that will all fail for a specific input
      class TypeA {
        static [kIngressRouterTest](_value: string): symbol {
          return Symbol('typeA-fail')
        }
      }

      class TypeB {
        static [kIngressRouterTest](_value: string): symbol {
          return Symbol('typeB-fail')
        }
      }

      class TypeC {
        static [kIngressRouterTest](_value: string): symbol {
          return Symbol('typeC-fail')
        }
      }

      class Routes {
        @Route.Get('/fail/:id')
        handleA(@Route.Param('id') id: TypeA) {
          return { type: 'A', id }
        }

        @Route.Get('/fail/:id')
        handleB(@Route.Param('id') id: TypeB) {
          return { type: 'B', id }
        }

        @Route.Get('/fail/:id')
        handleC(@Route.Param('id') id: TypeC) {
          return { type: 'C', id }
        }
      }

      const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
      await app.start()

      const result = await inject(app.driver, {
        method: 'GET',
        url: '/fail/test',
      })

      assert.strictEqual(result.statusCode, 404)
    })
  })

  describe('symbol-based testing efficiency', () => {
    it('should use sentinel validation when available', async () => {
      let numericTestCallCount = 0
      let stringTestCallCount = 0
      let handler1ExecutionCount = 0
      let handler2ExecutionCount = 0

      class TestNumberType {
        static [kIngressRouterTest](value: string): symbol {
          numericTestCallCount++
          const num = Number(value)
          return isNaN(num) ? Symbol('fail') : kIngressRouterTestPass
        }

        static [Symbol.for('ingress:router:parse')](value: string): number {
          return Number(value)
        }
      }

      class TestStringType {
        static [kIngressRouterTest](value: string): symbol {
          stringTestCallCount++
          return /^\d+$/.test(value) ? Symbol('fail') : kIngressRouterTestPass
        }

        static [Symbol.for('ingress:router:parse')](value: string): string {
          return value
        }
      }

      class Routes {
        @Route.Get('/sentinel-validation/:id')
        handleNumeric(@Route.Param('id') id: TestNumberType) {
          handler1ExecutionCount++
          return { type: 'numeric', id, testCalls: numericTestCallCount, executions: handler1ExecutionCount }
        }

        @Route.Get('/sentinel-validation/:id')
        handleString(@Route.Param('id') id: TestStringType) {
          handler2ExecutionCount++
          return { type: 'string', id, testCalls: stringTestCallCount, executions: handler2ExecutionCount }
        }
      }

      const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
      await app.start()

      // Test numeric value - should pass sentinel validation for numeric, fail for string
      const numericResult = await inject(app.driver, {
        method: 'GET',
        url: '/sentinel-validation/123',
      })

      assert.strictEqual(numericResult.statusCode, 200)
      const numericResponse = JSON.parse(numericResult.payload)
      assert.strictEqual(numericResponse.type, 'numeric')
      assert.strictEqual(numericResponse.id, 123)
      assert.strictEqual(numericTestCallCount, 1)
      assert.strictEqual(stringTestCallCount, 0)
      assert.strictEqual(handler1ExecutionCount, 1)
      assert.strictEqual(handler2ExecutionCount, 0)

      // Reset counters
      numericTestCallCount = 0
      stringTestCallCount = 0
      handler1ExecutionCount = 0
      handler2ExecutionCount = 0

      // Test string value - should fail numeric validation, pass string validation
      const stringResult = await inject(app.driver, {
        method: 'GET',
        url: '/sentinel-validation/hello',
      })

      assert.strictEqual(stringResult.statusCode, 200)
      const stringResponse = JSON.parse(stringResult.payload)
      assert.strictEqual(stringResponse.type, 'string')
      assert.strictEqual(stringResponse.id, 'hello')
      assert.strictEqual(numericTestCallCount, 1)
      assert.strictEqual(stringTestCallCount, 1)
      assert.strictEqual(handler1ExecutionCount, 0)
      assert.strictEqual(handler2ExecutionCount, 1)
    })
  })

  describe('async validation', () => {
    it('should handle async symbol-based testing', async () => {
      class AsyncEfficientType {
        static async [kIngressRouterTest](value: string): Promise<symbol> {
          await new Promise((resolve) => setTimeout(resolve, 1))
          return value.startsWith('valid-') ? kIngressRouterTestPass : Symbol('async-fail')
        }

        static [Symbol.for('ingress:router:parse')](value: string): string {
          return value
        }
      }

      class AsyncFallbackType {
        static async [kIngressRouterTest](value: string): Promise<symbol> {
          await new Promise((resolve) => setTimeout(resolve, 1))
          return value.startsWith('fallback-') ? kIngressRouterTestPass : Symbol('async-fallback-fail')
        }

        static [Symbol.for('ingress:router:parse')](value: string): string {
          return value
        }
      }

      class Routes {
        @Route.Get('/async/:id')
        handleAsync(@Route.Param('id') id: AsyncEfficientType) {
          return { type: 'async', id }
        }

        @Route.Get('/async/:id')
        handleFallback(@Route.Param('id') id: AsyncFallbackType) {
          return { type: 'fallback', id }
        }
      }

      const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
      await app.start()

      // Test async validation success
      const asyncResult = await inject(app.driver, {
        method: 'GET',
        url: '/async/valid-test',
      })

      assert.strictEqual(asyncResult.statusCode, 200)
      const asyncResponse = JSON.parse(asyncResult.payload)
      assert.strictEqual(asyncResponse.type, 'async')
      assert.strictEqual(asyncResponse.id, 'valid-test')

      // Test fallback async validation
      const fallbackResult = await inject(app.driver, {
        method: 'GET',
        url: '/async/fallback-test',
      })

      assert.strictEqual(fallbackResult.statusCode, 200)
      const fallbackResponse = JSON.parse(fallbackResult.payload)
      assert.strictEqual(fallbackResponse.type, 'fallback')
      assert.strictEqual(fallbackResponse.id, 'fallback-test')
    })

    it('should fallback to exception-based validation when all symbol tests fail', async () => {
      class FailingSymbolType1 {
        static [kIngressRouterTest](_value: string): symbol {
          return Symbol('fail-1')
        }

        static [Symbol.for('ingress:router:parse')](value: string): string {
          return value
        }
      }

      class FailingSymbolType2 {
        static [kIngressRouterTest](_value: string): symbol {
          return Symbol('fail-2')
        }

        static [Symbol.for('ingress:router:parse')](value: string): string {
          return value
        }
      }

      class Routes {
        @Route.Get('/allfail/:id')
        handle1(@Route.Param('id') id: FailingSymbolType1) {
          return { type: '1', id }
        }

        @Route.Get('/allfail/:id')
        handle2(@Route.Param('id') id: FailingSymbolType2) {
          return { type: '2', id }
        }
      }

      const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
      await app.start()

      const result = await inject(app.driver, {
        method: 'GET',
        url: '/allfail/test',
      })

      assert.strictEqual(result.statusCode, 404)
    })
  })
})
