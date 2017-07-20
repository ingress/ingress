import { RouteAnnotation, Route } from '../src/annotations'
import { expect } from 'chai'

describe('Route annotations', () => {
  const parent = new RouteAnnotation('/parent/path'),
    child = new RouteAnnotation('/child/path')

  it('should resolve parent child paths', () => {
    const path = parent.resolvePath('prefix', child)

    expect(path).to.equal('/prefix/parent/path/child/path')
  })

  it('should resolve paths with no suffix', () => {
    const path = child.resolvePath('prefix')

    expect(path).to.equal('/prefix/child/path')
  })

  it('should resolve paths with no prefix', () => {
    const path = child.resolvePath('/')

    expect(path).to.equal('/child/path')
  })

  it('should resolve paths with a suffix and no prefix', () => {
    const path = parent.resolvePath('/', child)

    expect(path).to.equal('/parent/path/child/path')
  })

  it('should set methods on the annotation', () => {
    const path = new RouteAnnotation('some/path', Route.Get, 'get', 'GET', Route.Post)
    expect(path.methods).to.eql(['GET', 'POST'])
  })

  it('should ignore extranious leading and trailing slashes', () => {
    const parent = new RouteAnnotation('parent/path////'),
      child = new RouteAnnotation('////child/path/'),
      path = parent.resolvePath('///', child)

    expect(path).to.equal('/parent/path/child/path')
  })

  it('should ignore all prefixes with $', () => {
    const child = new RouteAnnotation('$/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    expect(childPath).to.equal('/child/path')
    expect(path).to.equal('/child/path')
  })

  it('should ignore the base path $', () => {
    const child = new RouteAnnotation('$'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    expect(path).to.equal('/')
    expect(childPath).to.equal('/')
  })

  it('should ignore parent prefixes with ~', () => {
    const child = new RouteAnnotation('~/child/path/'),
      path = parent.resolvePath('a-prefix', child),
      childPath = child.resolvePath('something')

    expect(childPath).to.equal('/something/child/path')
    expect(path).to.equal('/a-prefix/child/path')
  })
})
