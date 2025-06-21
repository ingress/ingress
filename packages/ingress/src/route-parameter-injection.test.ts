import { describe, it } from 'node:test'
import assert from 'node:assert'
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
      constructor(public thisThing: Thing2) {}

      @Route.Get('inject-type')
      someRoute(
        @Route.Inject()
        thing: Thing,
      ) {
        assert.deepEqual(thing, { value: 'thing' })
        return thing.value
      }
      @Route.Get('inject-token')
      token(@Route.Inject(Thing) thing: any, @Route.Inject() thing2: Thing) {
        assert.strictEqual(thing, thing2)
        return thing.value
      }
      @Route.Get('inject-transient-scoped')
      scoped(@Route.Inject({ transient: true }) thing: Thing, @Route.Inject() thing2: Thing) {
        assert.deepStrictEqual(thing, thing2)
        assert.notStrictEqual(thing, thing2)
        return thing.value
      }
      @Route.Get('inject-transient-singleton')
      singleton(@Route.Inject({ transient: true }) thing: Thing2) {
        assert.strictEqual(thing, app.container.get(Thing2))
        assert.strictEqual(this.thisThing, app.container.get(Thing2))
        return thing.value
      }
    }
    await app.start()
    void Greet

    const response = await inject(app.driver, '/inject-type')
    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.payload, 'thing')

    const response2 = await inject(app.driver, '/inject-token')
    assert.strictEqual(response2.statusCode, 200)
    assert.strictEqual(response2.payload, 'thing')

    const response3 = await inject(app.driver, '/inject-transient-scoped')
    assert.strictEqual(response3.statusCode, 200)
    assert.strictEqual(response3.payload, 'thing')

    const response4 = await inject(app.driver, '/inject-transient-singleton')
    assert.strictEqual(response4.statusCode, 200)
    assert.strictEqual(response4.payload, 'thing2')
  })
})
