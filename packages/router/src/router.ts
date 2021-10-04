import { StatusCode } from '@ingress/http-status'
import { reflectAnnotations } from 'reflect-annotations'
import { HttpMethod, Router as RouteMap } from 'router-tree-map'
import { createHandler } from './handler.js'
import {
  ControllerCollector,
  Type,
  ControllerDependencyCollector,
} from './annotations/controller.annotation.js'
import { resolvePaths, RouteMetadata, PathMap } from './route-resolve.js'

import type { Middleware, Ingress } from '@ingress/core'
import { Func, TypeResolver } from './type-resolver.js'

export type Pathname = string
export type QueryString = string

export { ControllerDependencyCollector }
export { Route } from './annotations/route.annotation'
export class Router {
  private collector = new ControllerCollector()
  private map!: RouteMap<Handle>

  /**
   * Given the "path" which potentially includes additional fragments, split the two
   * eg. : /path/to/route?with=query&parameters=1 => ['/path/to/route', 'with=query&parameters=1']
   *
   *
   *
   * @param path
   * @returns
   */
  public static readUrl(path?: string): [Pathname, QueryString] {
    if (!path) return ['/', '']
    const pathName = path
    let i = 0
    for (; i < path.length; i++) {
      const c = path.charCodeAt(i)
      if (QuerySep.Hash === c || QuerySep.QuestionMark === c || QuerySep.SemiColon === c) {
        path = path.slice(0, i)
        break
      }
    }
    return [path, pathName.slice(i + 1)]
  }

  public metadata = new Set<RouteMetadata>()
  public hasUpgrade = false
  public Controller = this.collector.collect
  public registeredMetadata!: Map<PathMap, RouteMetadata>
  public _root!: Router

  constructor({ controllers }: { controllers?: Iterable<Type<any>> } = {}) {
    controllers = controllers ?? []
    for (const ctrl of controllers) {
      this.collector.collect(ctrl)
    }
  }

  get root(): Router {
    if (this._root) {
      return this._root
    }
    throw new Error('Must call start before using the router.')
  }

  public start(app: Ingress<any>, next: Func<Promise<any>>): Promise<void> {
    //initialization w possible parent
    let root: Router = app.container.get(Router)
    if (!root) {
      root = this
      app.container.registerSingletonProvider({ provide: Router, useValue: this })
    }
    root.map = root.map || new RouteMap()
    root.registeredMetadata = root.registeredMetadata || new Map()
    this._root = root

    //lazy route registration
    for (const ctrl of this.collector.items) {
      app.container.registerProvider(ctrl)
      this.root.registerRouteClass(ctrl)
    }
    this.collector.clear()
    for (const route of this.metadata) {
      app.container.registerProvider(route.parent)
      this.root.registerRouteMetadata(route)
    }
    this.metadata.clear()
    return next()
  }

  private typeResolver = new TypeResolver()

  registerTypeResolver(type: Type<any>, resolver: Func): this {
    this.typeResolver.registerTypeResolver(type, resolver)
    return this
  }

  registerTypePredicateResolver(predicate: Func<boolean>, resolver: Func): this {
    this.typeResolver.registerTypePredicateResolver(predicate, resolver)
    return this
  }

  public registerRouteClass(type: Type<any>): this {
    const metadata = reflectAnnotations(type)
    for (const routeMetadata of metadata) {
      this.root.registerRouteMetadata(routeMetadata)
    }
    return this
  }

  public registerRouteMetadata(routeMetadata: RouteMetadata): this {
    const handler = createHandler(routeMetadata, this.typeResolver),
      paths = resolvePaths(routeMetadata)
    this.root.registeredMetadata.set(paths, routeMetadata)
    for (const [method, routes] of Object.entries(paths)) {
      for (const path of routes) {
        this.root.on(method as HttpMethod, path, handler)
      }
    }
    return this
  }

  public on(method: HttpMethod, route: string, handle: Handle): Router {
    if (method === 'UPGRADE') {
      this.hasUpgrade = true
    }
    this.root.map.on(method, route, handle)
    return this
  }

  public get middleware(): Middleware<any> {
    const router = this.root
    if (router !== this) {
      return (_ctx: any, next: any) => next()
    }
    return (context: RouterContext, next: any): Promise<any> => {
      const [url, queryString] = Router.readUrl(context.req.url),
        method = context.req.method || 'GET',
        { handle, params } = router.map.find(method, url)

      if (handle) {
        context.res.statusCode = StatusCode.Ok
        context.route = new RouteData(
          url,
          queryString,
          params,
          (context.req as any).body || context.req,
          handle
        )
        return context.route.exec(context, next)
      } else {
        context.res.statusCode = StatusCode.NotFound
      }
      return next()
    }
  }
}

const _searchParams = Symbol('_searchParams')

export class RouteData {
  private [_searchParams]: null | URLSearchParams = null

  public body: any = null

  get searchParams(): URLSearchParams {
    return this[_searchParams] || (this[_searchParams] = new URLSearchParams(this.queryString))
  }
  constructor(
    public path: string,
    public queryString: string,
    public params: ParamEntries,
    public rawBody: Body,
    public exec: Handle
  ) {}
}

export type Body = any
export type ParamEntries = [string, string][]
export type Handle = Middleware<any>
export type RouterContext = {
  parse(options: { mode: 'buffer' | 'string' | 'stream' | 'json' | 'auto' }): Promise<any>
  req: {
    url?: string
    method?: string
    headers: Record<string, string[] | string | undefined>
  }
  res: { statusCode: number }
  route?: RouteData | null
}
const enum QuerySep {
  Hash = 35,
  SemiColon = 59,
  QuestionMark = 63,
}
