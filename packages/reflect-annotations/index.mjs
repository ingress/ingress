import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const exp = require('./lib/cjs/index.js')

const AnnotationFactory = exp.AnnotationFactory,
  createAnnotationFactory = exp.createAnnotationFactory,
  getAnnotations = exp.getAnnotations,
  getParameterAnnotations = exp.getParameterAnnotations,
  isAnnotationFactory = exp.isAnnotationFactory,
  isAnnotationInstance = exp.isAnnotationInstance,
  reflectAnnotations = exp.reflectAnnotations,
  setAnnotations = exp.setAnnotations,
  setParameterAnnotations = exp.setParameterAnnotations,
  defaultExport = exp.default

export {
  AnnotationFactory,
  createAnnotationFactory,
  getAnnotations,
  getParameterAnnotations,
  isAnnotationFactory,
  isAnnotationInstance,
  reflectAnnotations,
  setAnnotations,
  setParameterAnnotations,
}

export default defaultExport
