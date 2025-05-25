import { RouteAnnotation, Route } from './route.annotation.js'
import { describe, it } from 'node:test'
import * as assert from 'node:assert'

const parent = new RouteAnnotation('/parent/path'),
  child = new RouteAnnotation('/child/path')

describe('route annotation', () => {
  it('should resolve parent child paths', () => {
    const path = parent.resolvePath('prefix', child)
    assert.strictEqual(path, '/prefix/parent/path/child/path')
  })

  it('should resolve paths with no suffix', () => {
    const path = child.resolvePath('prefix')
    assert.strictEqual(path, '/prefix/child/path')
  })

  it('should resolve paths with no prefix', () => {
    const path = child.resolvePath('/')
    assert.strictEqual(path, '/child/path')
  })

  it('should resolve paths with a suffix and no prefix', () => {
    const path = parent.resolvePath('/', child)
    assert.strictEqual(path, '/parent/path/child/path')
  })

  it('should set methods on the annotation', () => {
    const path = new RouteAnnotation('some/path', Route.Get, 'get', 'GET', Route.Post)
    assert.deepStrictEqual(path.methods, ['GET', 'POST'])
  })

  it('should ignore extraneous leading and trailing slashes', () => {
    const parent = new RouteAnnotation('parent/path////'),
      child = new RouteAnnotation('////child/path/'),
      path = parent.resolvePath('///', child)
    assert.strictEqual(path, '/parent/path/child/path')
  })

  it('should ignore all prefixes with $', () => {
    const child = new RouteAnnotation('$/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    assert.strictEqual(childPath, '/child/path')
    assert.strictEqual(path, '/child/path')
  })

  it('should ignore the base path $', () => {
    const child = new RouteAnnotation('$'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    assert.strictEqual(path, '/')
    assert.strictEqual(childPath, '/')
  })

  it('should ignore parent prefixes with ~', () => {
    const child = new RouteAnnotation('~/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    assert.strictEqual(childPath, '/something/child/path')
    assert.strictEqual(path, '/a-prefix/child/path')
  })
})
