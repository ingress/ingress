import * as t from 'uvu/assert'
import { test } from 'uvu'
import type { HttpContext } from '@ingress/types'
import { Started, start } from './request.util.test.js'
import type { Func } from '@ingress/core'

let started: Started, request: Started['request']

test('middleware return value', async () => {
  const res = await request('/a'),
    resB = await request('/b')
  t.is(res.payload, resB.payload)
  t.is(res.payload, 'value')
  t.is(res.status, 200)
  t.is(resB.status, 200)
})

test('explicit send with return value', async () => {
  const res = await request('/c')
  t.is(res.payload, 'reachable')
  t.is(res.status, 200)
})

test('queryParameters', async () => {
  const res = await request('/e?param=param')
  t.is(res.payload, 'result')
})

test.before(async () => {
  started = await start(void 0, ({ request, send }: HttpContext<any>, next: Func) => {
    switch (request.pathname) {
      case '/a':
        return 'value'
      case '/b':
        return Promise.resolve('value')
      case '/c':
        send.code(200)('reachable')
        return 'unreachable'
      case '/d':
        return send.code(200)()
      case '/e':
        t.equal(request.searchParams.get('param'), 'param')
        return 'result'
    }
    return next()
  })
  request = started.request
})

test.after(async () => {
  await started.app.stop()
})

test.run()
