import 'reflect-metadata'

const ANNOTATIONS = 'annotations',
  bind = Function.bind

export function getAnnotations (target: any, key?: string | symbol): Array<any> {
  return Reflect.getMetadata(ANNOTATIONS, target, <any>key) || []
}

export function setAnnotations (target: any, key?: string | symbol , annotations?: Array<any>) {
  Reflect.defineMetadata(ANNOTATIONS, annotations || [], target, key)
}

export type Annotation = ClassDecorator & MethodDecorator

export function createAnnotationFactory <T>(Type: {new(...args:any[]) : T}) {
  return function (...args: any[]): Annotation {
    const annotationInstance = new Type(...args)
    return (target: any, key?: string) => {
      const annotations = getAnnotations(target, key)
      annotations.push(annotationInstance)
      setAnnotations(target, key, annotations)
    }
  }
}
