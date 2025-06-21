import 'reflect-metadata'
import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { getAnnotations } from 'reflect-annotations'
import { ControllerCollector } from './controller.annotation.js'

describe('controller annotation', () => {
  it('should add items to a set', () => {
    const collector = new ControllerCollector()
    @collector.collect('prefix')
    class item {}

    collector.collect(item)
    assert.deepStrictEqual([...collector.items], [item])
  })

  it('should be a factory that also decorates', () => {
    const collector = new ControllerCollector()
    @collector.collect
    class item {}
    @collector.collect()
    class item2 {}
    assert.deepStrictEqual([...collector.items], [item, item2])
  })

  it('should decorate classes with a route', () => {
    const collector = new ControllerCollector()
    @collector.collect({ routePrefix: '/some/route' })
    class item {}
    const [{ path }] = getAnnotations(item)
    assert.strictEqual(path, 'some/route')
  })
})
