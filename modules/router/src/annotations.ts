import { createAnnotationFactory } from 'reflect-annotations'
import { RouterContext } from './context'

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  result = (x: string) => '/' + trim(x),
  upper = (x: any) => x.toString().toUpperCase()

class RouteAnnotation {

  public path: string
  public methods: string[]
  public resolvedPaths: string[]
  public ignoreParentPrefix: boolean
  public ignoreAllPrefix: boolean

  constructor (path: string, ...methods: Array<PathFactory | string>) {
    path = path || ''
    this.ignoreAllPrefix = path.startsWith('$')
    this.ignoreParentPrefix = path.startsWith('~')
    this.path = trim(path.replace(/^\$|^~/, '')),
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
    if (!suffix) {
      return result(this.ignoreAllPrefix ? this.path : (prefix + '/' + this.path))
    }
    if (suffix.ignoreAllPrefix) {
      return result(suffix.path)
    }
    if (suffix.ignoreParentPrefix) {
      return result(prefix + '/' + suffix.path)
    }
    return result(prefix + '/' + this.path + '/' + suffix.path)
  }
}

export type Annotation = ClassDecorator & MethodDecorator

export interface PathFactory {
  (urlDefinition?: string, ...methods: Array<PathFactory|string>): Annotation
}

export interface Route extends PathFactory {
  Get: PathFactory
  Post: PathFactory
  Put: PathFactory
  Delete: PathFactory
  Head: PathFactory
  Patch: PathFactory
}

const methods = ['Get','Post','Put','Delete','Head','Patch']

export const Route = <Route>methods.reduce((set, method) => {
  set[method] = (path: string) => set(path, method)
  set[method].toString = () => method
  return set
}, <any>createAnnotationFactory(RouteAnnotation))

export interface ParamAnnotation {
  extractValue?(context: RouterContext<any>): any
  convertType?<T>(value: any): any
}

class BodyParamAnnotation implements ParamAnnotation {
  extractValue(context: RouterContext<any>) {
    return context.req.body
  }
}

class PathParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string) {}

  extractValue(context: RouterContext<any>) {
    return context.req.params[this.paramName]
  }
}

class QueryParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string) {}

  extractValue(context: RouterContext<any>) {
    return context.req.query[this.paramName]
  }
}

class HeaderParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string) {}

  extractValue(context: RouterContext<any>) {
    return context.req.headers[this.paramName]
  }
}

const
  Body = createAnnotationFactory(BodyParamAnnotation),
  Path = createAnnotationFactory(PathParamAnnotation),
  Query = createAnnotationFactory(QueryParamAnnotation),
  Header = createAnnotationFactory(HeaderParamAnnotation),
  Param = {
    Body,
    Path,
    Query,
    Header
  },
  Get = Route.Get,
  Put = Route.Put,
  Post = Route.Post,
  Delete = Route.Delete,
  Head = Route.Head,
  Patch = Route.Patch

export {
  Body,
  Query,
  Header,
  Param,
  Get,
  Put,
  Post,
  Delete,
  Head,
  Patch,
  RouteAnnotation
}
