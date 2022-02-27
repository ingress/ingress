import { RouteAnnotation, Route } from './route.annotation.js'
import * as t from 'uvu/assert'
import { test } from 'uvu'

const parent = new RouteAnnotation('/parent/path'),
  child = new RouteAnnotation('/child/path')

test('should resolve parent child paths', () => {
  const path = parent.resolvePath('prefix', child)
  t.equal(path, '/prefix/parent/path/child/path')
})

test('should resolve paths with no suffix', () => {
  const path = child.resolvePath('prefix')
  t.equal(path, '/prefix/child/path')
})

test('should resolve paths with no prefix', () => {
  const path = child.resolvePath('/')
  t.equal(path, '/child/path')
})

test('should resolve paths with a suffix and no prefix', () => {
  const path = parent.resolvePath('/', child)
  t.equal(path, '/parent/path/child/path')
})

test('should set methods on the annotation', () => {
  const path = new RouteAnnotation('some/path', Route.Get, 'get', 'GET', Route.Post)
  t.equal(path.methods, ['GET', 'POST'])
})

test('should ignore extraneous leading and trailing slashes', () => {
  const parent = new RouteAnnotation('parent/path////'),
    child = new RouteAnnotation('////child/path/'),
    path = parent.resolvePath('///', child)
  t.equal(path, '/parent/path/child/path')
})

test('should ignore all prefixes with $', () => {
  const child = new RouteAnnotation('$/child/path/'),
    path = parent.resolvePath('a-prefix', child),
    childPath = child.resolvePath('something')

  t.equal(childPath, '/child/path')
  t.equal(path, '/child/path')
})

test('should ignore the base path $', () => {
  const child = new RouteAnnotation('$'),
    path = parent.resolvePath('a-prefix', child),
    childPath = child.resolvePath('something')

  t.equal(path, '/')
  t.equal(childPath, '/')
})

test('should ignore parent prefixes with ~', () => {
  const child = new RouteAnnotation('~/child/path/'),
    path = parent.resolvePath('a-prefix', child),
    childPath = child.resolvePath('something')

  t.equal(childPath, '/something/child/path')
  t.equal(path, '/a-prefix/child/path')
})

test.run()
