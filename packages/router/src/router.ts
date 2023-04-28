import { StatusCode } from '@ingress/types'
import { reflectAnnotations } from 'reflect-annotations'
import type { Readable } from 'node:stream'
import type { HttpMethod } from 'router-tree-map'
import { Router as RouteMap } from 'router-tree-map'
import { createHandler } from './handler.js'
import type { Type } from './annotations/controller.annotation.js'
import {
  ControllerCollector,
  ControllerDependencyCollector,
} from './annotations/controller.annotation.js'
import type { RouteMetadata, PathMap } from './route-resolve.js'
import { resolvePaths } from './route-resolve.js'
import type { Middleware, Ingress, NextFn, CoreContext } from '@ingress/core'
import type { Func } from './type-resolver.js'
import { TypeResolver } from './type-resolver.js'

export { ControllerDependencyCollector }
export { Route } from './annotations/route.annotation.js'

export type Pathname = string
export type QueryString = string

const enum QuerySep {
  Hash = 35,
  SemiColon = 59,
  QuestionMark = 63,
}

export function readUrl(path?: string): [Pathname, QueryString] {
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
  return [path, '?' + pathName.slice(i + 1)]
}
export class Router {
  private collector = new ControllerCollector()
  public metadata = new Set<RouteMetadata>()
  public registeredMetadata!: Map<PathMap, RouteMetadata>
  public hasUpgrade = false

  public Controller = this.collector.collect

  private map!: RouteMap<Handle>
  private app!: Ingress<any>
  private _root!: Router

  constructor({ routes }: { routes?: Iterable<Type<any>> } = {}) {
    routes = routes ?? []
    for (const ctrl of routes) {
      this.collector.collect(ctrl)
    }
  }
  initializeContext(ctx: RouterContext) {
    ctx.route = null
    return ctx
  }
  public async start(app: Ingress<any>, next: NextFn): Promise<{ router: Router }> {
    //initialization w possible parent
    let root = app.container.findProvidedSingleton(Router)
    if (!root) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      root = this
      app.container.registerSingleton({ provide: Router, useValue: this })
      root.app = app
    }
    root.map ||= new RouteMap()
    root.registeredMetadata ||= new Map()
    this._root = root

    for (const ctrl of this.collector.items) {
      root.registerRouteClass(ctrl)
    }
    this.collector.clear()
    for (const route of this.metadata) {
      root.registerRouteMetadata(route)
    }
    this.metadata.clear()
    await next()
    return {
      router: root,
    }
  }

  private typeResolver = new TypeResolver()

  registerTypeResolver(type: Type<any>, resolver: Func): this {
    this.typeResolver.register(type, resolver)
    return this
  }
  registerTypePredicateResolver(predicate: Func<boolean>, resolver: Func): this {
    this.typeResolver.registerPredicate(predicate, resolver)
    return this
  }

  public registerRouteClass(type: Type<any>): this {
    const metadata = reflectAnnotations(type)
    for (const routeMetadata of metadata) {
      this.registerRouteMetadata({
        controllerAnnotations: routeMetadata.classAnnotations,
        controller: routeMetadata.parent,
        ...routeMetadata,
      })
    }
    return this
  }

  public registerRouteMetadata(routeMetadata: RouteMetadata): this {
    if (!this.app) {
      this.metadata.add(routeMetadata)
      return this
    }
    this.app.container.registerScoped(routeMetadata.controller)
    const handler = createHandler(routeMetadata, this.typeResolver),
      paths = resolvePaths(routeMetadata)
    this._root.registeredMetadata.set(paths, routeMetadata)
    for (const [method, routes] of Object.entries(paths)) {
      for (const path of routes) {
        this._root.on(method as HttpMethod, path, handler)
      }
    }
    return this
  }

  public on(method: HttpMethod, route: string, handle: Handle): Router {
    if (method === 'UPGRADE') {
      this.hasUpgrade = true
    }
    this._root.map.on(method, route, handle)
    return this
  }

  public middleware(context: RouterContext, next: any) {
    const method = context.request.method || 'GET',
      { handle, params } = this._root.map.find(method, context.request.pathname)

    if (handle) {
      context.response.code(StatusCode.Ok)
      context.route = new RouteData(params, handle)
      return context.route.exec(context, next)
    } else {
      context.response.code(StatusCode.NotFound)
    }
    return next()
  }
}
export class RouteData {
  constructor(public params: ParamEntries, public exec: Handle) {}
}

export type Body = any
export type ParamEntries = [string, string][]
export type Handle = Middleware<any>
export interface RouterContext extends CoreContext {
  app: Ingress<RouterContext>
  request: {
    method: string
    body: any
    url: string
    pathname: string
    searchParams: URLSearchParams
    headers: Record<string, string | string[] | undefined>
    parse(options: { mode: 'string' } & ParseOptions): Promise<string>
    parse(options: { mode: 'buffer' } & ParseOptions): Promise<Buffer>
    parse<T = any>(options: { mode: 'json' } & ParseOptions): Promise<T>
    parse(options: { mode: 'stream' } & ParseOptions): Readable
    toRequest(): Request
  }
  response: { code: (code: number) => void }
  route: RouteData | null
}
export type ParseOptions = {
  sizeLimit?: number
  deserializer?: <T>(body: string) => T | Promise<T>
}
