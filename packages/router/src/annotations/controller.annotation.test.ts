import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { getAnnotations } from 'reflect-annotations'
import { ControllerCollector } from './controller.annotation.js'

describe('controller annotation', () => {
  it('should add items to a set', () => {
    const collector = new ControllerCollector()
    @collector.collect('prefix')
    class item {}

    collector.collect(item)
    expect([...collector.items]).toEqual([item])
  })

  it('should be a factory that also decorates', () => {
    const collector = new ControllerCollector()
    @collector.collect
    class item {}
    @collector.collect()
    class item2 {}
    expect([...collector.items]).toEqual([item, item2])
  })

  it('should decorate classes with a route', () => {
    const collector = new ControllerCollector()
    @collector.collect({ routePrefix: '/some/route' })
    class item {}
    const [{ path }] = getAnnotations(item)
    expect(path).toEqual('some/route')
  })
})
