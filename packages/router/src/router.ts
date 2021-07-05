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

import type { EventEmitter } from 'events'
import type { Middleware } from 'app-builder'
import { Func, TypeResolver } from './type-resolver.js'

export type Pathname = string
export type QueryString = string

export { ControllerDependencyCollector }
export class Router {
  private collector = new ControllerCollector()
  private http!: RouteMap<Handle>
  private upgrade!: RouteMap<Handle>

  public static readUrl(url: string): [Pathname, QueryString] {
    const path = url
    let i = 0
    for (; i < url.length; i++) {
      const c = url.charCodeAt(i)
      if (QuerySep.Hash === c || QuerySep.QuestionMark === c || QuerySep.SemiColon === c) {
        url = url.slice(0, i)
        break
      }
    }
    return [url, path.slice(i + 1)]
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

  public start(app?: { router?: Router }): Promise<void> {
    //initialization w possible parent
    const root = app?.router || this
    root.http = root.http || new RouteMap()
    root.upgrade = root.upgrade || new RouteMap()
    root.registeredMetadata = root.registeredMetadata || new Map()
    this._root = root

    //lazy route registration
    for (const ctrl of this.collector.items) {
      this.root.registerRouteClass(ctrl)
    }
    this.collector.clear()
    for (const route of this.metadata) {
      this.root.registerRouteMetadata(route)
    }
    this.metadata.clear()

    return Promise.resolve()
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
      this.root.upgrade.on('GET', route, handle)
      this.hasUpgrade = true
    } else this.root.http.on(method, route, handle)
    return this
  }

  public stop(app?: { server: EventEmitter }): Promise<any> {
    void app
    return Promise.resolve()
  }

  public get middleware(): Middleware<any> {
    const router = this.root
    if (router !== this) {
      return (context, next) => next()
    }
    return (context: RouterContext, next: any): Promise<any> => {
      const [url, queryString] = Router.readUrl(context.req.url),
        method = context.req.method,
        { handle, params } = router.http.find(method, url)

      if (handle) {
        context.res.statusCode = StatusCode.Ok
        context.route = new Route(url, queryString, params, context.req.body || context.req, handle)
        return context.route.exec(context, next)
      } else {
        context.res.statusCode = StatusCode.NotFound
      }
      return next()
    }
  }
}

export class Route {
  public body: any = null
  private _searchParams: null | URLSearchParams = null
  get searchParams(): URLSearchParams {
    return this._searchParams || (this._searchParams = new URLSearchParams(this.queryString))
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
  req: { url: string; method: string; headers: Record<string, string>; body: any }
  res: { statusCode: number }
  route?: Route | null
}
const enum QuerySep {
  Hash = 35,
  SemiColon = 59,
  QuestionMark = 63,
}
