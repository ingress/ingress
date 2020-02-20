import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import { BaseContext } from '../context'

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  result = (x: string) => '/' + trim(x),
  upper = (x: any) => x.toString().toUpperCase()

class RouteAnnotation {
  public path: string
  public methods: string[] = []
  public ignoreParentPrefix: boolean
  public ignoreAllPrefix: boolean

  constructor(path: string, ...methods: Array<PathFactory | string>) {
    path = path || ''
    this.ignoreAllPrefix = path.startsWith('$')
    this.ignoreParentPrefix = path.startsWith('~')
    this.path = trim(path.replace(/^\$|^~/, ''))
    this.methods = Array.from(new Set(methods.map(upper)))
  }

  get isHttpMethodAnnotation() {
    return Boolean(this.methods.length)
  }

  get isRouteAnnotation() {
    return true
  }

  resolvePath(prefix: string, suffix?: RouteAnnotation) {
    prefix = trim(prefix)
    if (!suffix) {
      return result(this.ignoreAllPrefix ? this.path : prefix + '/' + this.path)
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

export interface PathFactory {
  (urlDefinition?: string, ...methods: Array<PathFactory | string>): Annotation
}

export interface Route extends PathFactory {
  Get: PathFactory
  Post: PathFactory
  Put: PathFactory
  Delete: PathFactory
  Head: PathFactory
  Patch: PathFactory
}

const methods = ['Get', 'Post', 'Put', 'Delete', 'Head', 'Patch']

export const Route = methods.reduce((set, method) => {
  set[method] = (path: string, ...otherMethods: Array<PathFactory | string>) => {
    return set(path, ...[...otherMethods, method])
  }
  set[method].toString = () => method
  return set
}, createAnnotationFactory(RouteAnnotation) as any) as Route

export interface ParamAnnotation {
  extractValue?(context: BaseContext<any, any>): any
  convertType?(value: any): any
}

class BodyParamAnnotation implements ParamAnnotation {
  constructor(private key?: string | ((body: any) => any)) {}

  extractValue(context: BaseContext<any, any>) {
    if ('function' === typeof this.key) {
      return this.key(context.route.body)
    }
    return this.key ? context.route.body && context.route.body[this.key] : context.route.body
  }
}

class PathParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string | ((query: any) => any)) {}

  extractValue(context: BaseContext<any, any>) {
    if ('function' === typeof this.paramName) {
      return this.paramName(context.route.params)
    }
    return context.route.params[this.paramName]
  }
}

class ContextParamAnnotation implements ParamAnnotation {
  extractValue(context: BaseContext<any, any>) {
    return context
  }
}

class QueryParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string | ((query: any) => any)) {}

  extractValue(context: BaseContext<any, any>) {
    if ('function' === typeof this.paramName) {
      return this.paramName(context.route.query)
    }
    return context.route.query[this.paramName]
  }
}

class HeaderParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string) {}

  extractValue(context: BaseContext<any, any>) {
    return context.req.headers[this.paramName]
  }
}

const Body: (key?: string | ((body: any) => any)) => Annotation = createAnnotationFactory(BodyParamAnnotation),
  Path = createAnnotationFactory(PathParamAnnotation),
  Query = createAnnotationFactory(QueryParamAnnotation),
  Header = createAnnotationFactory(HeaderParamAnnotation),
  Context = createAnnotationFactory(ContextParamAnnotation),
  Param = {
    Body,
    Path,
    Query,
    Header,
    Context
  },
  Get = Route.Get,
  Put = Route.Put,
  Post = Route.Post,
  Delete = Route.Delete,
  Head = Route.Head,
  Patch = Route.Patch

export { Body, Query, Header, Param, Get, Put, Post, Delete, Head, Patch, RouteAnnotation, Annotation }
