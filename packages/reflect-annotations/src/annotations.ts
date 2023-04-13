///<reference types="reflect-metadata"/>

const ANNOTATIONS = 'annotations',
  PARAMETER_ANNOTATIONS = 'parameter-annotations',
  PARAMETER_TYPES = 'design:paramtypes',
  RETURN_TYPE = 'design:returntype'

export declare let Type: FunctionConstructor
export interface Type<T> {
  new (...args: any[]): T
}
export const AnnotationFactory = Symbol.for('reflect-annotations.factory')
export interface AnnotationFactory<T = any> {
  (...args: any[]): Annotation<T>
}
export type Target = any
export type MaybeAnnotationFactory = any
export function isAnnotationFactory(
  thing: MaybeAnnotationFactory
): thing is (...args: any[]) => Annotation<any> {
  return typeof thing === 'function' && thing[AnnotationFactory] === true
}

export function isAnnotationInstance(annotation: any): annotation is Annotation<any> {
  return Boolean(annotation && 'annotationInstance' in annotation)
}

export function getAnnotations(target: Target, key?: string | symbol): Array<any> {
  return Reflect.getMetadata(ANNOTATIONS, target, key as any) || []
}

export function setAnnotations(
  target: Target,
  key?: string | symbol,
  annotations?: Array<any>
): void {
  Reflect.defineMetadata(ANNOTATIONS, annotations, target, key as any)
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

export function createAnnotationFactory<T extends new (...args: any[]) => InstanceType<T>>(
  Type: T
): (...args: ConstructorParameters<T>) => Annotation<InstanceType<T>> {
  return Object.assign(
    function (...args: ConstructorParameters<T>) {
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
