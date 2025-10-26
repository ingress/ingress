import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import type { RouterContext } from '../router.js'
import type { NextFn } from '@ingress/core'
import { kIngressRouterParse, kIngressRouterPick } from '../handler.js'

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
  public fallback?: boolean

  constructor(
    path?: string,
    ...methodsOrOptions: Array<PathFactoryAnnotation | string | { fallback?: boolean }>
  ) {
    path = path || ''
    this.ignoreAllPrefix = path.startsWith('$')
    this.ignoreParentPrefix = path.startsWith('~')
    this.path = trim(path.replace(/^[\$|^~]/, ''))

    // Filter out options object from methods
    const methods = []
    let options: { fallback?: boolean } | undefined

    for (const item of methodsOrOptions) {
      if (
        typeof item === 'object' &&
        item !== null &&
        !('annotationInstance' in item) &&
        typeof item !== 'function'
      ) {
        // This is an options object
        options = item as { fallback?: boolean }
      } else {
        // This is a method or PathFactoryAnnotation
        methods.push(item)
      }
    }

    this.methods = Array.from(new Set(methods.map(upper)))
    if (options && options.fallback) {
      this.fallback = true
    }
  }

  isRouteAnnotation = true

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
  (
    urlDefinition?: string,
    ...methodsAndOptions: Array<PathFactoryAnnotation | string | { fallback?: boolean }>
  ): Annotation
}

export interface ParamAnnotationFactory {
  (keyname?: string): Annotation
}

/**
 * @public
 */
export interface ParamAnnotationBase {
  [kIngressRouterPick](context: RouterContext, token?: any): any
}

export class InjectParamAnnotation implements ParamAnnotationBase {
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

  [kIngressRouterParse](x: any) {
    return x
  }
  [kIngressRouterPick](context: RouterContext) {
    let token = this.token
    if (!token) {
      const idx = context.route?.meta?.parameterAnnotations?.findIndex((x) => x === this)
      if (typeof idx === 'number') {
        token = context.route?.meta?.types?.parameters?.[idx]
      }
    }
    const container = this.transient ? context.app.container.createChildWithContext(context) : context.scope

    return container.get(token)
  }
}

/**
 * @public
 */
export class BodyParamAnnotation implements ParamAnnotationBase {
  constructor(private keyName?: string) {}
  [kIngressRouterPick](context: RouterContext): any {
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
  [kIngressRouterPick](context: RouterContext): any {
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
  [kIngressRouterPick](context: RouterContext): any {
    if (this.searchParam === undefined) {
      return Object.fromEntries(context.request?.searchParams)
    }
    return context.request?.searchParams.get(this.searchParam)
  }
}

/**
 * @public
 */
export class HeaderParamAnnotation implements ParamAnnotationBase {
  constructor(private paramName: string) {}
  [kIngressRouterPick](context: RouterContext): any {
    return context.request.headers[this.paramName.toLowerCase()]
  }
}

/**
 * @public
 */
export class UpgradeRouteAnnotation extends RouteAnnotation {
  isBodyParser = true
  middleware(context: RouterContext, next: NextFn): any {
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
    set[method] = (
      path: string,
      ...otherMethodsOrOptions: Array<PathFactoryAnnotation | string | { fallback?: boolean }>
    ) => {
      return set(path, ...[...otherMethodsOrOptions, method])
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
  }) as any,
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
