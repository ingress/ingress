import { describe, it, expect } from 'vitest'
import ingress from './ingress.js'
import { inject } from '@hapi/shot'

describe('ingress', () => {
  it('route parameter injection', async () => {
    const app = ingress(),
      { Route, Routes, Service, Singleton } = app

    @Service
    class Thing {
      value = 'thing'
    }
    @Singleton
    class Thing2 {
      value = 'thing2'
    }

    @Routes('/')
    class Greet {
      @Route.Get('inject-type')
      someRoute(
        @Route.Inject()
        thing: Thing
      ) {
        expect(thing).toEqual({ value: 'thing' })
        return thing.value
      }
      @Route.Get('inject-token')
      token(@Route.Inject(Thing) thing: any, @Route.Inject() thing2: Thing) {
        expect(thing).toBe(thing2)
        return thing.value
      }
      @Route.Get('inject-transient-scoped')
      scoped(@Route.Inject({ transient: true }) thing: Thing, @Route.Inject() thing2: Thing) {
        expect(thing).toEqual(thing2)
        expect(thing).not.toBe(thing2)
        return thing.value
      }
      @Route.Get('inject-transient-singleton')
      singleton(@Route.Inject({ transient: true }) thing: Thing2) {
        expect(thing).toBe(app.container.get(Thing2))
        return thing.value
      }
    }
    await app.start()
    void Greet

    const response = await inject(app.driver, '/inject-type')
    expect(response.statusCode).toEqual(200)
    expect(response.payload).toEqual('thing')

    const response2 = await inject(app.driver, '/inject-token')
    expect(response2.statusCode).toEqual(200)
    expect(response2.payload).toEqual('thing')

    const response3 = await inject(app.driver, '/inject-transient-scoped')
    expect(response3.statusCode).toEqual(200)
    expect(response3.payload).toEqual('thing')

    const response4 = await inject(app.driver, '/inject-transient-singleton')
    expect(response4.statusCode).toEqual(200)
    expect(response4.payload).toEqual('thing2')
  })
})
