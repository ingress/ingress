import { test } from 'uvu'
import * as t from 'uvu/assert'
import {
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  createAnnotationFactory,
  AnnotationFactory,
} from './index.js'

const isFunction = (x: any) => typeof x === 'function'

test('api', () => {
  t.ok(typeof AnnotationFactory === 'symbol')
  t.ok(isFunction(getAnnotations))
  t.ok(isFunction(getParameterAnnotations))
  t.ok(isFunction(setAnnotations))
  t.ok(isFunction(setParameterAnnotations))
  t.ok(isFunction(createAnnotationFactory))
})

test.run()
