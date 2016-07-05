import { getAnnotations, setAnnotations, createAnnotationFactory } from './annotations'
import { reflectClassProperties } from './reflect-class'

export {
  getAnnotations,
  setAnnotations,
  createAnnotationFactory
}

export interface AnnotatedPropertyDescription {
  name: string,
  classAnnotations: Array<any>,
  methodAnnotations: Array<any>
}

class PropertyDescription implements AnnotatedPropertyDescription {
  classAnnotations: Array<any> = [];
  methodAnnotations: Array<any> = [];
  constructor (public name: string) {}
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
  const annotations = property.name in ctor.prototype
      ? getAnnotations(ctor.prototype, property.name)
      : []

  return getAnnotations(ctor).reduce(
      addClassAnnotation,
      annotations.reduce(addMethodAnnotation, property)
    )
}

export function reflectAnnotations (source: Function): Array<AnnotatedPropertyDescription> {
  const classMetadata = reflectClassProperties(source)

  return classMetadata.properties
    .reduce((properties, propertyName) => {
      properties.push(classMetadata.constructors
        .reduceRight(collectPropertyAnnotations, new PropertyDescription(propertyName))
      )
      return properties
    }, [])
}

export default reflectAnnotations
