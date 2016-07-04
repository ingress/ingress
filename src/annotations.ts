import 'reflect-metadata'

const ANNOTATIONS = 'annotations',
  bind = Function.bind

export function getAnnotations (target: any, key?: string | symbol): Array<any> {
  return Reflect.getMetadata(ANNOTATIONS, target, <any>key) || []
}

export function setAnnotations (target: any, key?: string | symbol , annotations?: Array<any>) {
  Reflect.defineMetadata(ANNOTATIONS, annotations || [], target, key)
}

export function createAnnotationFactory (Type: Function) {
  return function () {
    const annotationInstance = new (bind.apply(Type, arguments))
    return (target: any, key?: string) => {
      const annotations = getAnnotations(target, key)
      annotations.push(annotationInstance)
      setAnnotations(target, key, annotations)
    }
  }
}
