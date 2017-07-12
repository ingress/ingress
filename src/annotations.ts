import 'reflect-metadata'

const ANNOTATIONS = 'annotations',
  bind = Function.bind

export interface Constructor<T> { new (...args: any[]): T }
export interface Constructor0<T> { new (): T }
export interface Constructor1<T, A1> { new (a1: A1): T }
export interface Constructor2<T, A1, A2> { new (a1: A1, a2: A2): T }
export interface Constructor3<T, A1, A2, A3> { new (a1: A1, a2: A2, a3: A3): T }
export interface Constructor4<T, A1, A2, A3, A4> { new (a1: A1, a2: A2, a3: A3, a4: A4): T }
export interface Constructor5<T, A1, A2, A3, A4, A5> { new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5): T }
export interface Constructor6<T, A1, A2, A3, A4, A5, A6> { new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6): T }
export interface Constructor7<T, A1, A2, A3, A4, A5, A6, A7> { new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7): T }
export interface Constructor8<T, A1, A2, A3, A4, A5, A6, A7, A8> { new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8): T }
export interface Constructor9<T, A1, A2, A3, A4, A5, A6, A7, A8, A9> { new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8, a9: A9): T }

export function getAnnotations (target: any, key?: string | symbol): Array<any> {
  return Reflect.getMetadata(ANNOTATIONS, target, <any>key) || []
}

export function setAnnotations (target: any, key?: string | symbol , annotations?: Array<any>) {
  Reflect.defineMetadata(ANNOTATIONS, annotations || [], target, key)
}

export type Annotation = ClassDecorator & MethodDecorator

export function createAnnotationFactory <T>(Type: Constructor0<T>): () => Annotation
export function createAnnotationFactory <T, A1>(Type: Constructor1<T, A1>): (a1: A1) => Annotation
export function createAnnotationFactory <T, A1, A2>(Type: Constructor2<T, A1, A2>): (a1: A1, a2: A2) => Annotation
export function createAnnotationFactory <T, A1, A2, A3>(Type: Constructor3<T, A1, A2, A3>): (a1: A1, a2: A2, a3: A3) => Annotation
export function createAnnotationFactory <T, A1, A2, A3, A4>(Type: Constructor4<T, A1, A2, A3, A4>): (a1: A1, a2: A2, a3: A3, a4: A4) => Annotation
export function createAnnotationFactory <T, A1, A2, A3, A4, A5>(Type: Constructor5<T, A1, A2, A3, A4, A5>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Annotation
export function createAnnotationFactory <T, A1, A2, A3, A4, A5, A6>(Type: Constructor6<T, A1, A2, A3, A4, A5, A6>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Annotation
export function createAnnotationFactory <T, A1, A2, A3, A4, A5, A6, A7>(Type: Constructor7<T, A1, A2, A3, A4, A5, A6, A7>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Annotation
export function createAnnotationFactory <T, A1, A2, A3, A4, A5, A6, A7, A8>(Type: Constructor8<T, A1, A2, A3, A4, A5, A6, A7, A8>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Annotation
export function createAnnotationFactory <T, A1, A2, A3, A4, A5, A6, A7, A8, A9>(Type: Constructor9<T, A1, A2, A3, A4, A5, A6, A7, A8, A9>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8, a9: A9) => Annotation
export function createAnnotationFactory <T> (Type: Constructor<T>): (...args: any[]) => Annotation
export function createAnnotationFactory <T>(Type: Constructor<T>) {
  return function (...args: any[]): Annotation {
    const annotationInstance = new Type(...args)
    return (target: any, key?: string) => {
      const annotations = getAnnotations(target, key)
      annotations.push(annotationInstance)
      setAnnotations(target, key, annotations)
    }
  }
}
