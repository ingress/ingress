import 'reflect-metadata'
import { test } from 'uvu'
import * as t from 'uvu/assert'
import { getAnnotations } from 'reflect-annotations'
import { ControllerCollector } from './controller.annotation.js'

test('should add items to a set', () => {
  const collector = new ControllerCollector()
  @collector.collect('prefix')
  class item {}

  collector.collect(item)
  t.equal([...collector.items], [item])
})

test('should be a factory that also decorates', () => {
  const collector = new ControllerCollector()
  @collector.collect
  class item {}
  @collector.collect()
  class item2 {}
  t.equal([...collector.items], [item, item2])
})

test('should decorate classes with a route', () => {
  const collector = new ControllerCollector()
  @collector.collect({ routePrefix: '/some/route' })
  class item {}
  const [{ path }] = getAnnotations(item)
  t.equal(path, 'some/route')
})

test.run()
