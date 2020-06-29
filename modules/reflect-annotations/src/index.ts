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
  Constructor,
  AnnotationFactory,
} from './annotations'
import { reflectClassProperties } from './reflect-class'

interface AnnotatedPropertyDescription {
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
  constructor(public name: string, public declaredOrder: boolean) {}
}

function addClassAnnotation(property: AnnotatedPropertyDescription, annotation: any) {
  property.classAnnotations.push(annotation)
  return property
}
function addMethodAnnotation(property: AnnotatedPropertyDescription, annotation: any) {
  property.methodAnnotations.push(annotation)
  return property
}

function collectPropertyAnnotations<T = any>(property: AnnotatedPropertyDescription, ctor: Constructor<T>) {
  const methodAnnotations = property.name in ctor.prototype ? getAnnotations(ctor.prototype, property.name) : [],
    order = property.declaredOrder ? 'reduceRight' : 'reduce'
  property = getAnnotations(ctor)[order]<AnnotatedPropertyDescription>(
    addClassAnnotation,
    methodAnnotations[order]<AnnotatedPropertyDescription>(addMethodAnnotation, property)
  )
  property.parameterAnnotations =
    property.name in ctor.prototype ? getParameterAnnotations(ctor.prototype, property.name) : []
  property.types.parameters = getParameterTypes(ctor.prototype, property.name)
  property.types.return = getReturnType(ctor.prototype, property.name)
  return property
}

function reflectAnnotations<T = any>(
  source: Constructor<T>,
  options: { declaredOrder: boolean } = { declaredOrder: true }
): AnnotatedPropertyDescription[] {
  const classMetadata = reflectClassProperties(source)

  return classMetadata.properties.reduce<AnnotatedPropertyDescription[]>((properties, propertyName) => {
    properties.push(
      classMetadata.constructors.reduceRight<AnnotatedPropertyDescription>(
        collectPropertyAnnotations,
        new PropertyDescription(propertyName, options.declaredOrder)
      )
    )
    return properties
  }, [])
}

export default reflectAnnotations

export { reflectAnnotations, AnnotatedPropertyDescription, Annotation }
export {
  getAnnotations,
  setAnnotations,
  getParameterAnnotations,
  setParameterAnnotations,
  createAnnotationFactory,
  isAnnotationFactory,
  AnnotationFactory,
}
