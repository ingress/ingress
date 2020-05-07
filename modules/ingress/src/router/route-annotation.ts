import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import { ParseBody } from './raw-parser'
import { BaseContext } from '../context'

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  result = (x: string) => '/' + trim(x),
  upper = (x: any) => x.toString().toUpperCase(),
  hasOwnProperty = {}.hasOwnProperty,
  getKey = (obj: any, key: string) => {
    if (obj && hasOwnProperty.call(obj, key)) {
      return obj[key]
    }
    return undefined
  }

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

export interface ParamAnnotation {
  extractValue(context: BaseContext<any, any>): any
}

class BodyParamAnnotation implements ParamAnnotation {
  constructor(private key?: string | ((body: any) => any)) {}

  extractValue(context: BaseContext<any, any>) {
    if ('function' === typeof this.key) {
      return this.key(context.route.body)
    }
    if (this.key) {
      return getKey(context.route.body, this.key)
    }
    return context.route?.body
  }
}

class PathParamAnnotation implements ParamAnnotation {
  constructor(private paramName?: string | ((query: any) => any)) {}

  extractValue(context: BaseContext<any, any>) {
    if ('function' === typeof this.paramName) {
      return this.paramName(context.route.params)
    }
    if (this.paramName) {
      return getKey(context.route.params, this.paramName)
    }
    return context.route.params
  }
}

class ContextParamAnnotation implements ParamAnnotation {
  extractValue(context: BaseContext<any, any>) {
    return context
  }
}

class QueryParamAnnotation implements ParamAnnotation {
  constructor(private paramName?: string | ((query: any) => any)) {}

  extractValue(context: BaseContext<any, any>) {
    if ('function' === typeof this.paramName) {
      return this.paramName(context.route.query)
    }
    if (this.paramName) {
      return getKey(context.route.query, this.paramName)
    }
    return context.route.query
  }
}

class HeaderParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string) {}

  extractValue(context: BaseContext<any, any>) {
    return context.req.headers[this.paramName]
  }
}

const methods = ['Get', 'Post', 'Put', 'Delete', 'Head', 'Patch'],
  Body = createAnnotationFactory(BodyParamAnnotation) as (key?: string | ((body: any) => any)) => Annotation,
  Path = createAnnotationFactory(PathParamAnnotation) as (key?: string | ((body: any) => any)) => Annotation,
  Query = createAnnotationFactory(QueryParamAnnotation) as (key?: string | ((body: any) => any)) => Annotation,
  Header = createAnnotationFactory(HeaderParamAnnotation),
  Context = createAnnotationFactory(ContextParamAnnotation)

export interface Route extends PathFactory {
  /**
   * Accept the HTTP GET Method
   */
  Get: PathFactory
  /**
   * Accept the HTTP POST Method
   */
  Post: PathFactory
  /**
   * Accept the HTTP PUT Method
   */
  Put: PathFactory
  /**
   * Accept the HTTP DELETE Method
   */
  Delete: PathFactory
  /**
   * Accept the HTTP HEAD Method
   */
  Head: PathFactory
  /**
   * Accept the HTTP PATCH Method
   */
  Patch: PathFactory
  /**
   * Extract the body, or body property to the decorated argument
   */
  Body: typeof Body
  /**
   * Extract the path parameters, or specific paramter to the decorated argument
   */
  Path: typeof Path
  /**
   * Extract the query parameters, or specific query parameter to the decorated argument
   */
  Query: typeof Query
  /**
   * Extract the specific header to the decorated argument
   */
  Header: typeof Header
  /**
   * Extract the context object to the decorated argument
   */
  Context: typeof Context
  /**
   * Use Custom Parsing (stream or buffer) as a middleware annotation
   */
  Parse: typeof ParseBody
}

export const Route = methods.reduce(
  (set, method) => {
    set[method] = (path: string, ...otherMethods: Array<PathFactory | string>) => {
      return set(path, ...[...otherMethods, method])
    }
    set[method].toString = () => method
    return set
  },
  Object.assign(createAnnotationFactory(RouteAnnotation), {
    Body,
    Path,
    Query,
    Header,
    Context,
    Parse: ParseBody,
  }) as any
) as Route

export { RouteAnnotation, Annotation }
