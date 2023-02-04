import {
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  getParameterTypes,
  getReturnType,
  createAnnotationFactory,
  Annotation,
  isAnnotationFactory,
  isAnnotationInstance,
  AnnotationFactory,
  Type,
} from './annotations.js'
import { reflectClassProperties } from './reflect-class.js'
interface AnnotatedPropertyDescription {
  parent: Type<any>
  name: string
  classAnnotations: Array<any>
  methodAnnotations: Array<any>
  parameterAnnotations: Array<any>
  types: { parameters?: any[]; return?: any }
  declaredOrder: boolean
}

class PropertyDescription implements AnnotatedPropertyDescription {
  classAnnotations: Array<any> = []
  methodAnnotations: Array<any> = []
  parameterAnnotations: Array<any> = []
  types = {}
  constructor(public name: string, public parent: Type<any>, public declaredOrder: boolean) {}
}

function addClassAnnotation(property: AnnotatedPropertyDescription, annotation: any) {
  property.classAnnotations.push(annotation)
  return property
}
function addMethodAnnotation(property: AnnotatedPropertyDescription, annotation: any) {
  property.methodAnnotations.push(annotation)
  return property
}

function collectPropertyAnnotations<T = any>(
  property: AnnotatedPropertyDescription,
  ctor: Type<T>
) {
  const methodAnnotations = getAnnotations(ctor.prototype, property.name),
    order = property.declaredOrder ? 'reduceRight' : 'reduce'
  property = getAnnotations(ctor)[order]<AnnotatedPropertyDescription>(
    addClassAnnotation,
    methodAnnotations[order]<AnnotatedPropertyDescription>(addMethodAnnotation, property)
  )
  property.parameterAnnotations = getParameterAnnotations(ctor.prototype, property.name)
  property.types.parameters = getParameterTypes(ctor.prototype, property.name)
  property.types.return = getReturnType(ctor.prototype, property.name)
  return property
}

function reflectAnnotations<T = any>(
  source: Type<T>,
  options: { declaredOrder: boolean } = { declaredOrder: true }
): AnnotatedPropertyDescription[] {
  const classMetadata = reflectClassProperties(source)

  return classMetadata.properties.reduce<AnnotatedPropertyDescription[]>(
    (properties, propertyName) => {
      properties.push(
        classMetadata.constructors.reduceRight<AnnotatedPropertyDescription>(
          collectPropertyAnnotations,
          new PropertyDescription(propertyName, source, options.declaredOrder)
        )
      )
      return properties
    },
    []
  )
}

export default reflectAnnotations

export { reflectAnnotations, AnnotatedPropertyDescription }
/* c8 ignore next */
export { Annotation }
export {
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  createAnnotationFactory,
  isAnnotationFactory,
  isAnnotationInstance,
  AnnotationFactory,
}
