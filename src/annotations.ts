import { createAnnotationFactory } from 'reflect-annotations'

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  upper = (x: any) => x.toString().toUpperCase()

export class RouteAnnotation {

  public path: string
  public methods: string[]
  public resolvedPaths: string[]
  public ignoreParentPrefix: boolean
  public ignoreAllPrefix: boolean

  constructor (path: string, ...methods: Array<Path | string>) {
    path = path || ''
    this.ignoreAllPrefix = path.startsWith('$')
    this.ignoreParentPrefix = path.startsWith('~')
    this.path = trim(path.replace(/^\$|^~/,'')),
    this.resolvedPaths = []
    this.methods = Array.from(new Set(methods.map(upper)))
  }

  get isHttpMethodAnnotation () {
    return Boolean(this.methods.length)
  }

  get isRouteAnnotation () {
    return true
  }

  resolvePath (prefix:string, suffix?: RouteAnnotation) {
    prefix = trim(prefix)
    let path = ''
    if (suffix) {
      path = suffix.ignoreAllPrefix && suffix.path
        || suffix.ignoreParentPrefix && prefix + '/' + suffix.path
        || prefix + '/' + this.path + '/' + suffix.path
    } else {
      path = this.ignoreAllPrefix && this.path
        || prefix + '/' + this.path
    }
    const result = '/' + trim(path)
    this.resolvedPaths.push(result)
    return result
  }
}

export type Annotation = ClassDecorator & MethodDecorator

export interface Path {
  (urlDefinition: string, ...methods: Array<Path|string>): Annotation
}

export interface Route extends Path {
  Get: Path
  Post: Path
  Put: Path
  Delete: Path
  Head: Path
  Patch: Path
}

const methods = ['Get','Post','Put','Delete','Head','Patch']

export const Route = <Route>methods.reduce((set, method) => {
  set[method] = (path: string) => set(path, method)
  set[method].toString = () => method
  return set
}, <any>createAnnotationFactory(RouteAnnotation))
