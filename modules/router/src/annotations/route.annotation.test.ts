import { RouteAnnotation, Route } from './route.annotation.js'
import t from 'tap'
t.test('Route annotations', (t) => {
  const parent = new RouteAnnotation('/parent/path'),
    child = new RouteAnnotation('/child/path')

  t.test('should resolve parent child paths', (t) => {
    const path = parent.resolvePath('prefix', child)
    t.equal(path, '/prefix/parent/path/child/path')
    t.end()
  })

  t.test('should resolve paths with no suffix', (t) => {
    const path = child.resolvePath('prefix')
    t.equal(path, '/prefix/child/path')
    t.end()
  })

  t.test('should resolve paths with no prefix', (t) => {
    const path = child.resolvePath('/')
    t.equal(path, '/child/path')
    t.end()
  })

  t.test('should resolve paths with a suffix and no prefix', (t) => {
    const path = parent.resolvePath('/', child)
    t.equal(path, '/parent/path/child/path')
    t.end()
  })

  t.test('should set methods on the annotation', (t) => {
    const path = new RouteAnnotation('some/path', Route.Get, 'get', 'GET', Route.Post)
    t.same(path.methods, ['GET', 'POST'])
    t.end()
  })

  t.test('should ignore extraneous leading and trailing slashes', (t) => {
    const parent = new RouteAnnotation('parent/path////'),
      child = new RouteAnnotation('////child/path/'),
      path = parent.resolvePath('///', child)
    t.equal(path, '/parent/path/child/path')
    t.end()
  })

  t.test('should ignore all prefixes with $', (t) => {
    const child = new RouteAnnotation('$/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    t.equal(childPath, '/child/path')
    t.equal(path, '/child/path')
    t.end()
  })

  t.test('should ignore the base path $', (t) => {
    const child = new RouteAnnotation('$'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    t.equal(path, '/')
    t.equal(childPath, '/')
    t.end()
  })

  t.test('should ignore parent prefixes with ~', (t) => {
    const child = new RouteAnnotation('~/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    t.equal(childPath, '/something/child/path')
    t.equal(path, '/a-prefix/child/path')
    t.end()
  })
  t.end()
})
