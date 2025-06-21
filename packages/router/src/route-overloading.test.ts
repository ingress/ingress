import 'reflect-metadata'
import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { inject } from '@hapi/shot'

import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'
import { Route } from './annotations/route.annotation.js'
import type { RouterContext } from './router.js'
import { Router } from './router.js'
import { ING_BAD_REQUEST } from '@ingress/types'

const kIngressRouterTest = Symbol.for('ingress:router:test')
const kIngressRouterTestPass = Symbol.for('ingress:router:test:pass')

describe('route overloading', () => {
  it('should support overloaded routes with different parameter types', async () => {
    class Routes {
      @Route.Get('/item/:id')
      getItemById(@Route.Param('id') id: number) {
        return { type: 'number', id, message: `Found item with numeric ID: ${id}` }
      }

      @Route.Get('/item/:id')
      getItemBySlug(@Route.Param('id') slug: string) {
        return { type: 'string', slug, message: `Found item with string slug: ${slug}` }
      }
    }

    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
    await app.start()

    // Test numeric ID route
    const numericResult = await inject(app.driver, {
      method: 'GET',
      url: '/item/123',
    })
    assert.strictEqual(numericResult.statusCode, 200)
    const numericResponse = JSON.parse(numericResult.payload)
    assert.strictEqual(numericResponse.type, 'number')
    assert.strictEqual(numericResponse.id, 123)

    // Test string slug route
    const stringResult = await inject(app.driver, {
      method: 'GET',
      url: '/item/my-article',
    })
    assert.strictEqual(stringResult.statusCode, 200)
    const stringResponse = JSON.parse(stringResult.payload)
    assert.strictEqual(stringResponse.type, 'string')
    assert.strictEqual(stringResponse.slug, 'my-article')
  })

  it('should handle validation errors correctly when all overloaded routes fail', async () => {
    // Create types that always fail validation
    class AlwaysFailOne {
      static [kIngressRouterTest](_value: string): symbol {
        return Symbol('fail-one')
      }
    }

    class AlwaysFailTwo {
      static [kIngressRouterTest](_value: string): symbol {
        return Symbol('fail-two')
      }
    }

    class Routes {
      @Route.Get('/fail/:id')
      failOne(@Route.Param('id') id: AlwaysFailOne) {
        return { id }
      }

      @Route.Get('/fail/:id')
      failTwo(@Route.Param('id') id: AlwaysFailTwo) {
        return { id }
      }
    }

    const app = new Ingress<RouterContext>().use(new Http()).use(new Router({ routes: [Routes] }))
    await app.start()

    const result = await inject(app.driver, {
      method: 'GET',
      url: '/fail/test',
    })

    // With symbol-based testing, all routes fail validation so we get 404
    assert.strictEqual(result.statusCode, 404)
  })
})
