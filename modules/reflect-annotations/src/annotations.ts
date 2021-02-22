///<reference types="reflect-metadata"/>

const ANNOTATIONS = 'annotations',
  PARAMETER_ANNOTATIONS = 'parameter-annotations',
  PARAMETER_TYPES = 'design:paramtypes',
  RETURN_TYPE = 'design:returntype'

export const AnnotationFactory = Symbol.for('reflect-annotations.factory')
export type AnnotationFactory<T> = (...args: any[]) => Annotation<T>
export type Target = any
export type MaybeAnnotationFactory = any
export function isAnnotationFactory(
  thing: MaybeAnnotationFactory
): thing is (...args: any[]) => Annotation<any> {
  return typeof thing === 'function' && thing[AnnotationFactory] === true
}
export interface Constructor<T> {
  new (...args: any[]): T
}
export interface Constructor0<T> {
  new (): T
}
export interface Constructor1<T, A1> {
  new (a1: A1): T
}
export interface Constructor2<T, A1, A2> {
  new (a1: A1, a2: A2): T
}
export interface Constructor3<T, A1, A2, A3> {
  new (a1: A1, a2: A2, a3: A3): T
}
export interface Constructor4<T, A1, A2, A3, A4> {
  new (a1: A1, a2: A2, a3: A3, a4: A4): T
}
export interface Constructor5<T, A1, A2, A3, A4, A5> {
  new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5): T
}
export interface Constructor6<T, A1, A2, A3, A4, A5, A6> {
  new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6): T
}
export interface Constructor7<T, A1, A2, A3, A4, A5, A6, A7> {
  new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7): T
}
export interface Constructor8<T, A1, A2, A3, A4, A5, A6, A7, A8> {
  new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8): T
}
export interface Constructor9<T, A1, A2, A3, A4, A5, A6, A7, A8, A9> {
  new (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8, a9: A9): T
}

export function getAnnotations(target: Target, key?: string | symbol): Array<any> {
  return Reflect.getMetadata(ANNOTATIONS, target, key as any) || []
}

export function setAnnotations(
  target: Target,
  key?: string | symbol,
  annotations?: Array<any>
): void {
  Reflect.defineMetadata(ANNOTATIONS, annotations || [], target, key as any)
}

export function getParameterAnnotations(target: Target, key: string | symbol): Array<any> {
  const annotations = Reflect.getMetadata(PARAMETER_ANNOTATIONS, target, key)
  return annotations ? Array.from(annotations) : []
}

export function setParameterAnnotations(
  target: Target,
  key: string | symbol,
  annotations: Array<any>
): void {
  Reflect.defineMetadata(PARAMETER_ANNOTATIONS, annotations, target, key)
}

export function getParameterTypes(target: Target, key: string | symbol): Array<any> | undefined {
  return Reflect.getMetadata(PARAMETER_TYPES, target, key)
}

export function getReturnType(target: Target, key: string | symbol): Array<any> | undefined {
  return Reflect.getMetadata(RETURN_TYPE, target, key)
}

export type Annotation<T = any> = ClassDecorator &
  MethodDecorator &
  ParameterDecorator & { annotationInstance: T }

export function createAnnotationFactory<T>(Type: Constructor0<T>): () => Annotation<T>
export function createAnnotationFactory<T, A1>(Type: Constructor1<T, A1>): (a1: A1) => Annotation<T>
export function createAnnotationFactory<T, A1, A2>(
  Type: Constructor2<T, A1, A2>
): (a1: A1, a2: A2) => Annotation<T>
export function createAnnotationFactory<T, A1, A2, A3>(
  Type: Constructor3<T, A1, A2, A3>
): (a1: A1, a2: A2, a3: A3) => Annotation<T>
export function createAnnotationFactory<T, A1, A2, A3, A4>(
  Type: Constructor4<T, A1, A2, A3, A4>
): (a1: A1, a2: A2, a3: A3, a4: A4) => Annotation<T>
export function createAnnotationFactory<T, A1, A2, A3, A4, A5>(
  Type: Constructor5<T, A1, A2, A3, A4, A5>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Annotation<T>
export function createAnnotationFactory<T, A1, A2, A3, A4, A5, A6>(
  Type: Constructor6<T, A1, A2, A3, A4, A5, A6>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Annotation<T>
export function createAnnotationFactory<T, A1, A2, A3, A4, A5, A6, A7>(
  Type: Constructor7<T, A1, A2, A3, A4, A5, A6, A7>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Annotation<T>
export function createAnnotationFactory<T, A1, A2, A3, A4, A5, A6, A7, A8>(
  Type: Constructor8<T, A1, A2, A3, A4, A5, A6, A7, A8>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Annotation<T>
export function createAnnotationFactory<T, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  Type: Constructor9<T, A1, A2, A3, A4, A5, A6, A7, A8, A9>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8, a9: A9) => Annotation<T>
export function createAnnotationFactory<T>(Type: Constructor<T>): AnnotationFactory<T>
export function createAnnotationFactory<T>(Type: Constructor<T>): AnnotationFactory<T> {
  return Object.assign(
    function annotationFactory(...args: any[]): Annotation<T> {
      const annotationInstance = new Type(...args),
        annotation = (
          target: any,
          key?: string | symbol,
          descriptorOrParamIndex?: PropertyDescriptor | number
        ) => {
          if (key && typeof descriptorOrParamIndex === 'number') {
            const annotations = getParameterAnnotations(target, key)
            annotations[descriptorOrParamIndex] = annotationInstance
            setParameterAnnotations(target, key, annotations)
          } else {
            const annotations = getAnnotations(target, key)
            annotations.push(annotationInstance)
            setAnnotations(target, key, annotations)
          }
        }
      annotation.annotationInstance = annotationInstance
      return annotation
    },
    { [AnnotationFactory]: true }
  )
}
