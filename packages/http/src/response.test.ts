import 'reflect-metadata'
import { beforeAll, describe, it, expect } from 'vitest'
import type { HttpContext } from '@ingress/types'
import { Started, start } from './request.util.test.js'
import type { NextFn } from '@ingress/core'

let started: Started, request: Started['request']

describe('response', () => {
  it('middleware return value', async () => {
    const res = await request('/a'),
      resB = await request('/b')
    expect(res.headers['content-type']).toEqual('text/plain;charset=UTF-8')
    expect(res.headers['content-length']).toEqual('5')
    expect(res.payload).toBe('value')
    expect(res.statusCode).toBe(200)

    expect(resB.headers['content-type']).toEqual('text/plain;charset=UTF-8')
    expect(resB.headers['content-length']).toEqual('5')
    expect(resB.payload).toBe('value')
    expect(resB.statusCode).toBe(200)
  })

  it('explicit send with return value', async () => {
    const res = await request('/c')
    expect(res.payload).toBe('reachable')
    expect(res.statusCode).toBe(200)
  })

  it('queryParameters', async () => {
    const res = await request('/e?param=param')
    expect(res.payload).toBe('result')
  })

  beforeAll(async () => {
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
          expect(request.searchParams.get('param')).toBe('param')
          return 'result'
      }
      return next()
    })
    request = started.request
  })
})
