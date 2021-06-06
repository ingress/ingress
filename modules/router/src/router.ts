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

export { ControllerDependencyCollector }
export class Router {
  public metadata = new Set<RouteMetadata>()
  private collector = new ControllerCollector()
  public Controller = this.collector.collect

  public registeredMetadata!: Map<PathMap, RouteMetadata>
  public _root!: Router
  private routes!: RouteMap<Handle>
  private upgrade!: RouteMap<Handle>

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

  public start(app?: { router?: Router; server: EventEmitter }): Promise<void> {
    //initialization w possible parent
    const root = app?.router ?? this
    root.routes = root.routes || new RouteMap()
    root.upgrade = root.upgrade || new RouteMap()
    root.registeredMetadata = root.registeredMetadata || new Map()
    this._root = root

    //lazy route registration
    for (const ctrl of this.collector.items) {
      this.root.registerType(ctrl)
    }
    this.collector.clear()
    for (const route of this.metadata) {
      this.root.registerMetadata(route)
    }
    this.metadata.clear()

    return Promise.resolve()
  }

  public registerType(type: Type<any>): void {
    const metadata = reflectAnnotations(type)
    for (const routeMetadata of metadata) {
      this.root.registerMetadata(routeMetadata)
    }
  }

  public registerMetadata(routeMetadata: RouteMetadata): void {
    const handler = createHandler(routeMetadata),
      paths = resolvePaths(routeMetadata)
    this.root.registeredMetadata.set(paths, routeMetadata)
    for (const [method, routes] of Object.entries(paths)) {
      for (const path of routes) {
        this.root.on(method as HttpMethod, path, handler)
      }
    }
  }

  public on(method: HttpMethod, route: string, handle: Handle): Router {
    if (method === 'UPGRADE') this.root.upgrade.on(method, route, handle)
    else this.root.routes.on(method, route, handle)
    return this
  }

  public stop(app?: { server: EventEmitter }): Promise<any> {
    void app
    return Promise.resolve()
  }

  public get middleware(): Middleware<any> {
    const router = this.root
    return (context: RouterContext, next: any): Promise<any> => {
      let url = context.req.url || '/',
        i = 0
      for (; i < url.length; i++) {
        const c = url.charCodeAt(i)
        if (QuerySep.Hash === c || QuerySep.QuestionMark === c || QuerySep.SemiColon === c) {
          url = url.slice(0, i)
          break
        }
      }
      const method = context.req.method as HttpMethod,
        queryString = context.req.url ? context.req.url.slice(i + 1) : '',
        { handle, params } = router.routes.find(method, url)

      if (handle) {
        context.res.statusCode = StatusCode.Ok
        context.route = new Route(url, queryString, params, context.req.body ?? context.req, handle)
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
  private searchParams: null | URLSearchParams = null
  get query(): URLSearchParams {
    return this.searchParams || (this.searchParams = new URLSearchParams(this.queryString))
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
  req: { url?: string; method?: string; headers?: Record<string, string>; body: any }
  res: { statusCode: number }
  route?: Route | null
}
const enum QuerySep {
  Hash = 35,
  SemiColon = 59,
  QuestionMark = 63,
}
