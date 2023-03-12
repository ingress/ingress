import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import type { RouterContext } from '../router.js'

export type Func<T = any> = (...args: any[]) => T

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  result = (x: string) => '/' + trim(x),
  upper = (x: any) => x.toString().toUpperCase()

export const kInjectAnnotation = Symbol('ingress.inject')

/**
 * @public
 */
export class RouteAnnotation {
  public path: string
  public methods: string[] = []
  public ignoreParentPrefix: boolean
  public ignoreAllPrefix: boolean

  constructor(path?: string, ...methods: Array<PathFactoryAnnotation | string>) {
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
export interface PathFactoryAnnotation {
  (urlDefinition?: string, ...methods: Array<PathFactoryAnnotation | string>): Annotation
}

export interface ParamAnnotationFactory {
  (keyname?: string): Annotation
}

/**
 * @public
 */
export interface ParamAnnotationBase {
  extractValue(context: RouterContext, type?: any): any
}

export class InjectParamAnnotation implements ParamAnnotationBase {
  [kInjectAnnotation] = true
  transient = false
  token: any
  constructor(token?: { transient: boolean } | any, options?: { transient: boolean }) {
    if (token && 'transient' in token && token.transient) {
      this.transient = true
    } else {
      this.token = token
    }
    if (options && 'transient' in options && options.transient) {
      this.transient = true
    }
  }
  extractValue(context: RouterContext, type: any) {
    let container = context.scope
    if (this.transient) {
      container = context.app.container.createChildWithContext(context)
    }

    return container.get(this.token || type)
  }
}

/**
 * @public
 */
export class BodyParamAnnotation implements ParamAnnotationBase {
  constructor(private keyName?: string) {}
  extractValue(context: RouterContext): any {
    return this.keyName
      ? context.request.body && (context.request.body as any)[this.keyName]
      : context.request.body
  }
}

/**
 * @public
 */
export class PathParamAnnotation implements ParamAnnotationBase {
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
export class QueryParamAnnotation implements ParamAnnotationBase {
  constructor(private searchParam: string) {}
  extractValue(context: RouterContext): any {
    return context.request?.searchParams.get(this.searchParam)
  }
}

/**
 * @public
 */
export class HeaderParamAnnotation implements ParamAnnotationBase {
  constructor(private paramName: string) {}
  extractValue(context: RouterContext): any {
    return context.request.headers[this.paramName.toLowerCase()]
  }
}

/**
 * @public
 */
export class UpgradeRouteAnnotation extends RouteAnnotation {
  isBodyParser = true
  middleware(context: RouterContext, next: Func<Promise<any>>): any {
    return next()
  }
  constructor(path?: string) {
    super(path, 'UPGRADE')
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
  Param = createAnnotationFactory(PathParamAnnotation),
  /**
   * @public
   */
  Query = createAnnotationFactory(QueryParamAnnotation),
  /**
   * @public
   */
  Inject = createAnnotationFactory(InjectParamAnnotation)

/**
 * @public
 */
export interface Route extends PathFactoryAnnotation {
  /**
   * Accept the HTTP GET Method
   */
  Get: PathFactoryAnnotation
  /**
   * Accept the HTTP POST Method
   */
  Post: PathFactoryAnnotation
  /**
   * Accept the HTTP PUT Method
   */
  Put: PathFactoryAnnotation
  /**
   * Accept the HTTP DELETE Method
   */
  Delete: PathFactoryAnnotation
  /**
   * Accept the HTTP HEAD Method
   */
  Head: PathFactoryAnnotation
  /**
   * Accept the HTTP PATCH Method
   */
  Patch: PathFactoryAnnotation
  /**
   * Extract the body, or body property to the decorated argument
   */
  Body: ParamAnnotationFactory
  /**
   * Extract the path parameters, or specific parameter to the decorated argument
   */
  Param: ParamAnnotationFactory
  /**
   * Extract the query parameters, or specific query parameter to the decorated argument
   */
  Query: ParamAnnotationFactory
  /**
   * Inject a provided item
   */
  Inject: (...args: ConstructorParameters<typeof InjectParamAnnotation>) => Annotation
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
    set[method] = (path: string, ...otherMethods: Array<PathFactoryAnnotation | string>) => {
      return set(path, ...[...otherMethods, method])
    }
    set[method].toString = () => method
    return set
  },
  Object.assign(createAnnotationFactory(RouteAnnotation), {
    Body,
    Param,
    Query,
    Header,
    Inject,
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
  Param,
  /**
   * @public
   */
  Body,
  /**
   * @public
   */
  Inject,
}
