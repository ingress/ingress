import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  reflectAnnotations,
  Annotation,
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  createAnnotationFactory,
  isAnnotationFactory,
  isAnnotationInstance,
  AnnotationFactory,
  default: reflectAnnotationsDefault,
} = require('./lib/cjs/index.js')

export {
  reflectAnnotations,
  Annotation,
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  createAnnotationFactory,
  isAnnotationFactory,
  isAnnotationInstance,
  AnnotationFactory,
}

export default reflectAnnotationsDefault
