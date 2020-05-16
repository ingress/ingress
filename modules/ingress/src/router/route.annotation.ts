import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import { Parse } from './parse.annotation'
import { DefaultContext } from '../context'

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  result = (x: string) => '/' + trim(x),
  upper = (x: any) => x.toString().toUpperCase(),
  hasOwn = {}.hasOwnProperty,
  getKey = (obj: any, key: string) => {
    if (obj && hasOwn.call(obj, key)) {
      return obj[key]
    }
    return undefined
  }

/**
 * @public
 */
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
/**
 * @public
 */
export interface PathFactory {
  (urlDefinition?: string, ...methods: Array<PathFactory | string>): Annotation
}
/**
 * @public
 */
export interface ParamAnnotation {
  extractValue(context: DefaultContext): any
}

function createParamAnnotationFactory(property: string) {
  return createAnnotationFactory(
    class {
      constructor(private key?: string | ((param: any) => any)) {}
      extractValue(context: DefaultContext) {
        const base = (context.route as any)[property]
        if ('function' === typeof this.key) {
          return this.key(base)
        }
        if (this.key) {
          return getKey(base, this.key)
        }
        return base
      }
    }
  ) as (key?: string | ((body: any) => any)) => Annotation
}
/**
 * @public
 */
const Body = createParamAnnotationFactory('body'),
  Path = createParamAnnotationFactory('params'),
  Query = createParamAnnotationFactory('query')
/**
 * @public
 */
export type RouteParamAnnotation = typeof Body
/**
 * @public
 */
export class ContextParamAnnotation implements ParamAnnotation {
  extractValue(context: DefaultContext) {
    return context
  }
}

/**
 * @public
 */
export class HeaderParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string) {}
  extractValue(context: DefaultContext) {
    return context.req.headers[this.paramName]
  }
}

const methods = ['Get', 'Post', 'Put', 'Delete', 'Head', 'Patch'],
  /**
   * @public
   */
  Header = createAnnotationFactory(HeaderParamAnnotation),
  /**
   * @public
   */
  Context = createAnnotationFactory(ContextParamAnnotation)

/**
 * @public
 */
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
  Body: RouteParamAnnotation
  /**
   * Extract the path parameters, or specific paramter to the decorated argument
   */
  Path: RouteParamAnnotation
  /**
   * Extract the query parameters, or specific query parameter to the decorated argument
   */
  Query: RouteParamAnnotation
  /**
   * Extract the specific header to the decorated argument
   */
  Header: typeof Header
  /**
   * Extract the context object to the decorated argument
   */
  Context: typeof Context
  /**
   * Use Custom Parsing as a middleware annotation
   */
  Parse: typeof Parse
}

/**
 * @public
 */
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
    Parse,
  }) as any
) as Route

export {
  RouteAnnotation,
  Annotation,
  Parse,
  Header,
  Context,
  /**
   * @public
   */
  Query,
  /**
   * @public
   */
  Path,
  /**
   * @public
   */
  Body,
}
