import { RouteAnnotation, Route } from './route.annotation.js'
import { describe, expect, it } from 'vitest'

const parent = new RouteAnnotation('/parent/path'),
  child = new RouteAnnotation('/child/path')

describe('route annotation', () => {
  it('should resolve parent child paths', () => {
    const path = parent.resolvePath('prefix', child)
    expect(path).toEqual('/prefix/parent/path/child/path')
  })

  it('should resolve paths with no suffix', () => {
    const path = child.resolvePath('prefix')
    expect(path).toEqual('/prefix/child/path')
  })

  it('should resolve paths with no prefix', () => {
    const path = child.resolvePath('/')
    expect(path).toEqual('/child/path')
  })

  it('should resolve paths with a suffix and no prefix', () => {
    const path = parent.resolvePath('/', child)
    expect(path).toEqual('/parent/path/child/path')
  })

  it('should set methods on the annotation', () => {
    const path = new RouteAnnotation('some/path', Route.Get, 'get', 'GET', Route.Post)
    expect(path.methods).toEqual(['GET', 'POST'])
  })

  it('should ignore extraneous leading and trailing slashes', () => {
    const parent = new RouteAnnotation('parent/path////'),
      child = new RouteAnnotation('////child/path/'),
      path = parent.resolvePath('///', child)
    expect(path).toEqual('/parent/path/child/path')
  })

  it('should ignore all prefixes with $', () => {
    const child = new RouteAnnotation('$/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    expect(childPath).toEqual('/child/path')
    expect(path).toEqual('/child/path')
  })

  it('should ignore the base path $', () => {
    const child = new RouteAnnotation('$'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    expect(path).toEqual('/')
    expect(childPath).toEqual('/')
  })

  it('should ignore parent prefixes with ~', () => {
    const child = new RouteAnnotation('~/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    expect(childPath).toEqual('/something/child/path')
    expect(path).toEqual('/a-prefix/child/path')
  })
})
