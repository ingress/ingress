import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import type { RouterContext } from '../router.js'

export type Func<T = any> = (...args: any[]) => T

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  result = (x: string) => '/' + trim(x),
  upper = (x: any) => x.toString().toUpperCase()

/**
 * @public
 */
export class RouteAnnotation {
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

  get isRouteAnnotation(): true {
    return true
  }

  resolvePath(prefix: string, suffix?: RouteAnnotation): string {
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
  extractValue(context: RouterContext): any
}

/**
 * @public
 */
export class BodyParamAnnotation implements ParamAnnotation {
  constructor(private keyName?: string) {}
  extractValue(context: RouterContext): any {
    return this.keyName ? context.route?.body[this.keyName] : context.route?.body
  }
}

/**
 * @public
 */
export class PathParamAnnotation implements ParamAnnotation {
  constructor(private keyName?: string) {}
  extractValue(context: RouterContext): any {
    const routeParams = context.route?.params || []
    if (this.keyName) {
      for (const [key, val] of routeParams) {
        if (key === this.keyName) {
          return val
        }
      }
    } else {
      return routeParams
    }
  }
}

/**
 * @public
 */
export class QueryParamAnnotation implements ParamAnnotation {
  constructor(private searchParam: string) {}
  extractValue(context: RouterContext): any {
    return context.route?.query.get(this.searchParam)
  }
}

/**
 * @public
 */
export class HeaderParamAnnotation implements ParamAnnotation {
  constructor(private paramName: string) {}
  extractValue(context: RouterContext): any {
    return context.req.headers?.[this.paramName]
  }
}

/**
 * @public
 */
export class UpgradeRouteAnnotation extends RouteAnnotation {
  isBodyParser = true
  upgrade = true
  middleware(context: RouterContext, next: Func<Promise<any>>): any {
    return next()
  }
  constructor(path: string) {
    super(path, 'Get')
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
  Upgrade = createAnnotationFactory(UpgradeRouteAnnotation),
  /**
   * @public
   */
  Body = createAnnotationFactory(BodyParamAnnotation),
  /**
   * @public
   */
  Path = createAnnotationFactory(PathParamAnnotation),
  /**
   * @public
   */
  Query = createAnnotationFactory(QueryParamAnnotation)

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
  Body: BodyParamAnnotation
  /**
   * Extract the path parameters, or specific paramter to the decorated argument
   */
  Path: PathParamAnnotation
  /**
   * Extract the query parameters, or specific query parameter to the decorated argument
   */
  Query: QueryParamAnnotation
  /**
   * Extract the specific header to the decorated argument
   */
  Header: typeof Header
  /**
   * Accept HTTP UPGRADE Requests
   */
  Upgrade: typeof Upgrade
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
    Upgrade,
  }) as any
) as Route

export {
  Annotation,
  /**
   * @public
   */
  Upgrade,
  /**
   * @public
   */
  Header,
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
