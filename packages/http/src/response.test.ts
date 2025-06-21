import 'reflect-metadata'
import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import type { Started } from './request.util.test.js'
import { start } from './request.util.test.js'
import type { NextFn } from '@ingress/core'
import type { HttpContext } from './http.context.js'

let started: Started, request: Started['request']

describe('response', () => {
  it('middleware return value', async () => {
    const res = await request('/a'),
      resB = await request('/b')
    assert.strictEqual(res.headers['content-type'], 'text/plain;charset=UTF-8')
    assert.strictEqual(res.headers['content-length'], '5')
    assert.strictEqual(res.payload, 'value')
    assert.strictEqual(res.statusCode, 200)

    assert.strictEqual(resB.headers['content-type'], 'text/plain;charset=UTF-8')
    assert.strictEqual(resB.headers['content-length'], '5')
    assert.strictEqual(resB.payload, 'value')
    assert.strictEqual(resB.statusCode, 200)
  })

  it('explicit send with return value', async () => {
    const res = await request('/c')
    assert.strictEqual(res.payload, 'reachable')
    assert.strictEqual(res.statusCode, 200)
  })

  it('queryParameters', async () => {
    const res = await request('/e?param=param')
    assert.strictEqual(res.payload, 'result')
  })

  before(async () => {
    started = await start(void 0, ({ request, response }: HttpContext<any>, next: NextFn) => {
      switch (request.pathname) {
        case '/a':
          return 'value'
        case '/b':
          return Promise.resolve('value')
        case '/c':
          response.code(200).send('reachable')
          return 'unreachable'
        case '/d':
          return response.code(200).send()
        case '/e':
          assert.strictEqual(request.searchParams.get('param'), 'param')
          return 'result'
      }
      return next()
    })
    request = started.request
  })
})
