import { StatusCode } from '@ingress/types'
import { reflectAnnotations } from 'reflect-annotations'
import type { Readable } from 'node:stream'
import type { HttpMethod } from 'router-tree-map'
import { Router as RouteMap } from 'router-tree-map'
import {
  createHandler,
  createRouteParameterTester,
  kIngressRouterParse,
  kIngressRouterPick,
  kIngressRouterParserKind,
  kIngressRouterSchema,
  kIngressRouterTest,
  kIngressRouterTestPass,
} from './handler.js'
import { ControllerCollector, ControllerDependencyCollector } from './annotations/controller.annotation.js'
import type { RouteMetadata, PathMap } from './route-resolve.js'
import { resolvePaths } from './route-resolve.js'
import type { Middleware, Ingress, NextFn, CoreContext } from '@ingress/core'
import type { Func } from './type-resolver.js'
import { TypeResolver } from './type-resolver.js'
import type { Type } from '@ingress/core'

export {
  ControllerDependencyCollector,
  kIngressRouterParse,
  kIngressRouterPick,
  kIngressRouterParserKind,
  kIngressRouterSchema,
  kIngressRouterTest,
  kIngressRouterTestPass,
}
export { Route } from './annotations/route.annotation.js'

export { ControllerCollector } from './annotations/controller.annotation.js'

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
  // Track overloaded routes: method:path -> Handle[]
  private overloadedRoutes = new Map<string, Handle[]>()

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

  registerTypeParser(type: Type<any>, parse: Func): this {
    this.typeResolver.register(type, { parse })
    return this
  }
  registerTypePredicateParser(predicate: Func<any, boolean>, parse: Func): this {
    this.typeResolver.registerPredicate(predicate, { parse })
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

    // Only create tester if route can be overloaded (has test methods)
    let tester: ((context: RouterContext) => Promise<symbol> | symbol) | undefined
    try {
      tester = createRouteParameterTester(routeMetadata, this.typeResolver)
    } catch (error: any) {
      // If tester creation fails, this route cannot be overloaded
      tester = undefined
    }

    this._root.registeredMetadata.set(paths, routeMetadata)
    for (const [method, routes] of Object.entries(paths)) {
      for (const path of routes) {
        this._root.on(method as HttpMethod, path, { handler, meta: routeMetadata, tester })
      }
    }
    return this
  }

  public on(method: HttpMethod, route: string, handle: Handle): Router {
    if (method === 'UPGRADE') {
      this.hasUpgrade = true
    }

    const routeKey = `${method}:${route}`

    try {
      this._root.map.on(method, route, handle)
    } catch (error: any) {
      // Check if this is a duplicate route error
      if (error.message.includes('A handle is already registered for path')) {
        // Track this as an overloaded route
        let overloadedHandles = this._root.overloadedRoutes.get(routeKey)

        if (!overloadedHandles) {
          // First time we encounter a duplicate - get the existing handle
          const existingResult = this._root.map.find(method, route)
          const existingHandle = existingResult.handle

          if (existingHandle) {
            overloadedHandles = [existingHandle]
            this._root.overloadedRoutes.set(routeKey, overloadedHandles)
          }
        }

        if (overloadedHandles) {
          // Add the new handle to the overloaded list
          overloadedHandles.push(handle)
        }
      } else {
        // Re-throw if it's not a duplicate route error
        throw error
      }
    }

    return this
  }

  /**
   * Execute overloaded handlers by testing parameters first, then executing the winner
   */
  private async executeOverloadedHandlers(
    handles: Handle[],
    context: RouterContext,
    params: ParamEntries,
    next: any,
  ): Promise<any> {
    // Filter handles to only those with testers (capable of route overloading)
    const testableHandles = handles.filter((handle) => handle.tester)

    if (testableHandles.length === 0) {
      // If no testable handles available, execute the first handle (fallback behavior)
      if (handles.length > 0) {
        context.route = new RouteData(params, handles[0].handler, handles[0].meta)
        return await context.route.exec(context, next)
      }
      context.response.code(StatusCode.NotFound)
      return next()
    }

    // Try each handler's parameter validation first
    for (const handle of testableHandles) {
      // Create a copy of context to avoid side effects during validation
      const contextCopy = { ...context }
      contextCopy.route = new RouteData(params, handle.handler, handle.meta)

      // Test parameter validation using efficient symbol-based testing
      const testResult = handle.tester!(contextCopy)

      let validationResult: symbol
      if (testResult && typeof testResult === 'object' && 'then' in testResult) {
        validationResult = await testResult
      } else {
        validationResult = testResult
      }

      // Check if validation passed using symbol-based testing
      if (validationResult === kIngressRouterTestPass) {
        // Efficient validation passed - execute the handler
        context.route = new RouteData(params, handle.handler, handle.meta)
        return await context.route.exec(context, next)
      }
      // If validation failed, continue to next handler (no exceptions thrown)
    }

    // If all handlers failed, return 404 since no handler matched
    context.response.code(StatusCode.NotFound)
    return next()
  }

  public middleware(context: RouterContext, next: any) {
    const method = context.request.method || 'GET',
      { handle, params } = this._root.map.find(method, context.request.pathname)

    if (handle) {
      context.response.code(StatusCode.Ok)

      // Check if this route has overloaded handlers
      // We need to find the route pattern that matches, not the exact pathname
      let overloadedHandles: Handle[] | undefined
      for (const [routeKey, handles] of this._root.overloadedRoutes.entries()) {
        const [keyMethod, keyRoute] = routeKey.split(':', 2)
        if (keyMethod === method) {
          // Check if this route pattern matches the current request
          const testResult = this._root.map.find(method, context.request.pathname)
          if (testResult.handle && handles.includes(testResult.handle)) {
            overloadedHandles = handles
            break
          }
        }
      }

      if (overloadedHandles && overloadedHandles.length > 1) {
        // Use the overloaded handler logic
        return this.executeOverloadedHandlers(overloadedHandles, context, params, next)
      } else {
        // Normal single handler execution
        context.route = new RouteData(params, handle.handler, handle.meta)
        return context.route.exec(context, next)
      }
    } else {
      context.response.code(StatusCode.NotFound)
    }
    return next()
  }
}
export class RouteData {
  constructor(
    public params: ParamEntries,
    public exec: Handle['handler'],
    public meta: RouteMetadata | null = null,
  ) {}
}

export type Body = any
export type ParamEntries = [string, string][]
export type Handle = {
  handler: Middleware<any>
  meta: RouteMetadata | null
  tester?: (context: RouterContext) => Promise<symbol> | symbol
}
export interface RouterContext extends CoreContext {
  app: Ingress<RouterContext>
  request: {
    method: string
    body: any
    url: string
    pathname: string
    search: string
    searchParams: URLSearchParams
    headers: Record<string, string | string[] | undefined>
    parse(options: { mode: 'string' } & ParseOptions): Promise<string>
    parse(options: { mode: 'buffer' } & ParseOptions): Promise<Buffer>
    parse<T = any>(options: { mode: 'json' } & ParseOptions<T>): Promise<T>
    parse(options: { mode: 'stream' } & ParseOptions): Readable
    asRequest(): Request
  }
  response: { code: (code: number) => void }
  route: RouteData | null
}
export type ParseOptions<T = any> = {
  sizeLimit?: number
  deserializer?: (body: string) => T | Promise<T>
}
