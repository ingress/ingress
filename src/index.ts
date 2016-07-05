import { getAnnotations, setAnnotations, createAnnotationFactory } from './annotations'
import { reflectClassProperties } from './reflect-class'

export {
  getAnnotations,
  setAnnotations,
  createAnnotationFactory
}

export interface IAnnotatedPropertyDescription {
  name: string,
  classAnnotations: Array<any>,
  methodAnnotations: Array<any>
}

class Property implements IAnnotatedPropertyDescription {
  classAnnotations: Array<any> = [];
  methodAnnotations: Array<any> = [];
  constructor (public name: string) {}
}

function addClassAnnotation (property: IAnnotatedPropertyDescription, annotation: any) {
  property.classAnnotations.push(annotation)
  return property
}
function addMethodAnnotation (property: IAnnotatedPropertyDescription, annotation: any) {
  property.methodAnnotations.push(annotation)
  return property
}

function collectPropertyAnnotations (property: IAnnotatedPropertyDescription, ctor: Function) {
  const annotations = property.name in ctor.prototype
      ? getAnnotations(ctor.prototype, property.name)
      : []

  return getAnnotations(ctor).reduce(
      addClassAnnotation,
      annotations.reduce(addMethodAnnotation, property)
    )
}

export function reflectAnnotations (source: Function) {
  const classMetadata = reflectClassProperties(source),
    result: Array<IAnnotatedPropertyDescription> = []

  return classMetadata.properties
    .reduce((properties, propertyName) => {
      properties.push(classMetadata.constructors
        .reduceRight(collectPropertyAnnotations, new Property(propertyName))
      )
      return properties
    }, result)
}

export default reflectAnnotations
