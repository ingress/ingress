import type { Middleware } from '@ingress/core'
import { compose } from '@ingress/core'
import type { RouteMetadata } from './route-resolve.js'
import { type RouterContext } from './router.js'
import type { Func } from './type-resolver.js'
import type { TypeResolver } from './type-resolver.js'

export const kIngressRouterParse = Symbol.for('ingress:router:parse')
export const kIngressRouterPick = Symbol.for('ingress:router:pick')
export const kIngressRouterParserKind = Symbol.for('ingress:router:parser')
export const kIngressRouterSchema = Symbol.for('ingress:router:schema')

function isPrimitive(value: any) {
  return !(
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    value !== undefined
  )
}

export const MiddlewarePriority = {
  BeforeBodyParser: 'BeforeBodyParser',
}

export const DEFAULT_BODY_BYTES = 1.5e7

export function defaultParser(context: RouterContext, next: () => Promise<any>): Promise<any> | void {
  if (context.request.method === 'GET' || context.request.method === 'HEAD') {
    return next()
  }
  const contentType = context.request.headers['content-type']
  if (
    (typeof contentType === 'string' &&
      contentType.startsWith('application') &&
      contentType.indexOf('json') > 11) ||
    (Array.isArray(contentType) &&
      contentType.find((x) => x.startsWith('application') && x.indexOf('json') > 11))
  ) {
    const contentLength = Number(context.request.headers['content-length'])
    return context.request
      .parse({ mode: 'json', sizeLimit: contentLength || DEFAULT_BODY_BYTES })
      .then((x: any) => {
        context.request.body = x
        return next()
      })
  } else {
    return next()
  }
}

export function resolveRouteMiddleware(route: RouteMetadata, typeResolver: TypeResolver) {
  const handler = route.controller.prototype[route.name],
    createController = (context: any) => context.scope.get(route.controller),
    resolveArgs = createParamsResolver(route, typeResolver)

  return (context: any, _next: any) => {
    const controller = createController(context),
      args = resolveArgs(context)

    if (checkAsync(args)) {
      return args.then((resolvedArgs) => handler.apply(controller, resolvedArgs)).then(context.send)
    }
    return handler.apply(controller, args)
  }
}

const pickIngRequest = (context: any) => context.request,
  identity = (x: any) => x

/**
 * Get a function that resolves route parameter metadata to arguments for the route
 * @param route
 * @param typeResolver
 * @returns a function that resolves arguments for the route
 */
function createParamsResolver(route: RouteMetadata, typeResolver: TypeResolver) {
  const pl = Math.max(route.types?.parameters?.length ?? 0, route.parameterAnnotations?.length ?? 0),
    resolvers: Func<RouterContext, any>[] = []

  for (let i = 0; i < pl; i++) {
    const type = route.types?.parameters?.[i],
      annotation = route.parameterAnnotations?.[i]

    let pick =
        annotation?.[kIngressRouterPick]?.bind(annotation) || type?.[kIngressRouterPick] || pickIngRequest,
      parse = type?.[kIngressRouterParse] || annotation?.[kIngressRouterParse]?.bind(annotation) || identity

    const resolver = typeResolver.get(type)
    if (resolver) {
      pick = resolver.pick ?? pick
      parse = resolver.parse ?? parse
    }

    const usableType = Boolean(
      type?.[kIngressRouterParse] || type?.[kIngressRouterPick] || parse !== identity,
    )

    if (!resolver && type && !usableType) {
      throw new Error(
        `No type converter found for: ${route.controller.name}.${route.name} at argument ${i}:${type.name}`,
      )
    }

    resolvers.push((context: RouterContext) => {
      const picked = pick(context)
      if (checkAsync(picked)) {
        return picked.then(parse)
      }
      return parse(picked)
    })
  }

  return function paramResolver(context: any): any[] | Promise<any[]> {
    const args = [],
      l = resolvers.length
    let isAsync = false
    for (let i = 0; i < l; i++) {
      const resolved = resolvers[i](context)
      if (checkAsync(resolved)) {
        isAsync = true
      }
      args.push(resolved)
    }
    if (isAsync) {
      // TODO:calebboyd - consider collecting all rejections
      return Promise.all(args)
    }
    return args
  }
}

function isRegularMiddleware(x: any) {
  return !x.isBodyParser && 'middleware' in x && !(x.middlewarePriority in MiddlewarePriority)
}

function checkAsync(thing: any): thing is PromiseLike<any> {
  return !isPrimitive(thing) && 'then' in thing && typeof thing.then === 'function'
}

function getMiddleware(x: any) {
  return x.middleware
}

/**
 * Handler Factory,
 * Given the route metadata, compile a handler (optimization boundary)
 * Executed once per route.
 */
export function createHandler(route: RouteMetadata, typeResolver: TypeResolver): Middleware<any> {
  const routeAnnotations = (route.controllerAnnotations || []).concat(route.methodAnnotations || []),
    beforeParse = routeAnnotations.filter(beforeBodyParser).map(getMiddleware),
    bodyParser = routeAnnotations.find(isBodyParser)?.middleware,
    middleware = routeAnnotations.filter(isRegularMiddleware).map(getMiddleware),
    routeMiddleware = resolveRouteMiddleware(route, typeResolver)

  return compose(...beforeParse, bodyParser || defaultParser, ...middleware, routeMiddleware)
}

const beforeBodyParser = (x: { middlewarePriority: keyof typeof MiddlewarePriority }) =>
    x.middlewarePriority === MiddlewarePriority.BeforeBodyParser,
  isBodyParser = (x: { isBodyParser: boolean }) => x.isBodyParser
