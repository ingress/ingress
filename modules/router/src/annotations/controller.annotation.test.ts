import 'reflect-metadata'
import t from 'tap'
import { getAnnotations } from 'reflect-annotations'
import { ControllerCollector } from './controller.annotation.js'

t.test('Controller collector', (t) => {
  t.test('should add items to a set', (t) => {
    const collector = new ControllerCollector()
    @collector.collect('prefix')
    class item {}
    collector.collect(item)
    collector.collect(item)
    t.same([...collector.items], [item])
    t.end()
  })

  t.test('should be a factory that also decorates', (t) => {
    const collector = new ControllerCollector()
    @collector.collect
    class item {}
    @collector.collect()
    class item2 {}
    t.same([...collector.items], [item, item2])
    t.end()
  })

  t.test('should decorate classes with a route', (t) => {
    const collector = new ControllerCollector()
    @collector.collect({ routePrefix: '/some/route' })
    class item {}
    const [{ path }] = getAnnotations(item)
    t.equal(path, 'some/route')
    t.end()
  })
  t.end()
})
