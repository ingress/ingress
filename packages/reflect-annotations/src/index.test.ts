import { describe, it } from 'node:test'
import t from 'node:assert'
import {
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  createAnnotationFactory,
  AnnotationFactory,
} from './index.js'

const isFunction = (x: any) => typeof x === 'function'

describe('api surface', () => {
  it('api', () => {
    t.ok(typeof AnnotationFactory === 'symbol')
    t.ok(isFunction(getAnnotations))
    t.ok(isFunction(getParameterAnnotations))
    t.ok(isFunction(setAnnotations))
    t.ok(isFunction(setParameterAnnotations))
    t.ok(isFunction(createAnnotationFactory))
  })
})
