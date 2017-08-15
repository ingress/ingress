import {
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  getParameterTypes,
  getReturnType,
  createAnnotationFactory
} from './annotations'
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
  types: { parameters?: any[], return?: any },
  declaredOrder: boolean
}

class PropertyDescription implements AnnotatedPropertyDescription {
  classAnnotations: Array<any> = [];
  methodAnnotations: Array<any> = [];
  parameterAnnotations: Array<any> = [];
  types = {};
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

function collectPropertyAnnotations (property: AnnotatedPropertyDescription, ctor: Function) {
  const methodAnnotations = property.name in ctor.prototype
      ? getAnnotations(ctor.prototype, property.name)
      : [],
    classAnnotations = getAnnotations(ctor),
    order = property.declaredOrder ? 'reduceRight' : 'reduce'
  property = getAnnotations(ctor)[order]<AnnotatedPropertyDescription>(
    addClassAnnotation,
    methodAnnotations[order]<AnnotatedPropertyDescription>(addMethodAnnotation, property)
  )

  property.parameterAnnotations = property.name in ctor.prototype ? getParameterAnnotations(ctor.prototype, property.name) : []
  property.types.parameters = getParameterTypes(ctor.prototype, property.name)
  property.types.return = getReturnType(ctor.prototype, property.name)
  return property
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
