import { getAnnotations, setAnnotations, getParameterAnnotations, setParameterAnnotations, createAnnotationFactory } from './annotations'
import { reflectClassProperties } from './reflect-class'

export {
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  createAnnotationFactory
}

export interface AnnotatedPropertyDescription {
  name: string,
  classAnnotations: Array<any>,
  methodAnnotations: Array<any>,
  parameterAnnotations: Array<any>,
  declaredOrder: boolean
}

class PropertyDescription implements AnnotatedPropertyDescription {
  classAnnotations: Array<any> = [];
  methodAnnotations: Array<any> = [];
  parameterAnnotations: Array<any> = [];
  constructor (public name: string, public declaredOrder: boolean) {}
}

function addClassAnnotation (property: AnnotatedPropertyDescription, annotation: any) {
  property.classAnnotations.push(annotation)
  return property
}
function addMethodAnnotation (property: AnnotatedPropertyDescription, annotation: any) {
  property.methodAnnotations.push(annotation)
  return property
}
function addParameterAnnotations (property: AnnotatedPropertyDescription, annotation: any, index: number) {
  property.parameterAnnotations[index] = annotation
  return property
}

function collectPropertyAnnotations (property: AnnotatedPropertyDescription, ctor: Function) {
  const annotations = property.name in ctor.prototype
      ? getAnnotations(ctor.prototype, property.name)
      : [],
    parameterAnnotations = property.name in ctor.prototype
      ? [...getParameterAnnotations(ctor.prototype, property.name)]
      : [],
    order = property.declaredOrder ? 'reduceRight' : 'reduce'
  return getAnnotations(ctor)[order]<AnnotatedPropertyDescription>(
      addClassAnnotation,
      annotations[order]<AnnotatedPropertyDescription>(
        addMethodAnnotation,
        parameterAnnotations.reduce<AnnotatedPropertyDescription>(addParameterAnnotations, property)
      )
    )
}

export function reflectAnnotations (source: Function, options: { declaredOrder: boolean } = { declaredOrder: true }) {
  const classMetadata = reflectClassProperties(source)

  return classMetadata.properties
    .reduce<AnnotatedPropertyDescription[]>((properties, propertyName) => {
      properties.push(classMetadata.constructors
        .reduceRight<AnnotatedPropertyDescription>(collectPropertyAnnotations, new PropertyDescription(propertyName, options.declaredOrder))
      )
      return properties
    }, [])
}

export default reflectAnnotations
