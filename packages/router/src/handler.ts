import { compose, Middleware } from '@ingress/core'
import { Func, TypeResolver } from './type-resolver.js'
import type { RouteMetadata } from './route-resolve.js'
import type { RouterContext } from './router.js'

function isPrimitive(value: any) {
  return (typeof value !== 'object' && typeof value !== 'function') || value === null
}

enum MiddlewarePriority {
  'BeforeBodyParser' = 'BeforeBodyParser',
}

export function defaultParser(context: RouterContext, next: () => Promise<any>): Promise<any> {
  return context.request.parse({ mode: 'json' }).then((x: any) => {
    //eslint-disable-next-line
    context.request.body = x
    return next()
  })
}

export function resolveRouteMiddleware<T>(
  route: RouteMetadata,
  typeResolver = new TypeResolver()
): Middleware<T> {
  const method = route.controller.prototype[route.name],
    createController = (context: any) => context.scope.get(route.controller),
    resolveArgs = createParamsResolver(route, typeResolver)

  return (context: any, _next: any) => {
    const controller = createController(context),
      args = resolveArgs(context)

    if ('then' in args) {
      return args.then((resolvedArgs) => method.apply(controller, resolvedArgs)).then(context.send)
    }
    return method.apply(controller, args)
  }
}

const pickRequest = (context: any) => context.request

/**
 * Get a function that resolves route parameter metadata to arguments for the route
 * @param route
 * @param typeResolver
 * @returns a function that resolves arguments for the route
 */
function createParamsResolver(route: RouteMetadata, typeResolver: TypeResolver) {
  const paramLength = Math.max(
      route.types?.parameters?.length ?? 0,
      route.parameterAnnotations?.length ?? 0
    ),
    resolvers: Func[] = []

  for (let i = 0; i < paramLength; i++) {
    const annotation = route.parameterAnnotations?.[i],
      type = route.types?.parameters?.[i],
      pick =
        annotation?.extractValue?.bind(annotation) || type?.extractValue?.bind(type) || pickRequest
    if (!type) {
      resolvers.push(pick)
      continue
    }

    if (URLSearchParams === type) {
      resolvers.push((context: RouterContext) => {
        //eslint-disable-next-line
        return context.request.searchParams
      })
      continue
    }

    if ('transformValue' in type) {
      resolvers.push((context: RouterContext) => type.transformValue(pick(context)))
      continue
    }
    //search registered type resolvers
    const resolver = typeResolver.getResolver(type)
    if (resolver) {
      resolvers.push((context: any) => resolver(pick(context)))
    }
    if (!resolver) {
      throw new Error(
        `No type converter found for: ${route.controller.name}.${route.name} at argument ${i}:${type.name}`
      )
    }
  }

  //hot path ...generate function?
  return function paramResolver(context: any): any[] | Promise<any[]> {
    const args = [],
      l = resolvers.length
    let isAsync = false
    for (let i = 0; i < l; i++) {
      const resolved = resolvers[i](context)
      if (resolved && !isPrimitive(resolved) && 'then' in resolved) {
        isAsync = true
      }
      args.push(resolved)
    }
    if (isAsync) {
      return Promise.all(args)
    }
    return args
  }
}

function isRegularMiddleware(x: any) {
  return !x.isBodyParser && 'middleware' in x && !(x.middlewarePriority in MiddlewarePriority)
}

function resolvePreRouteMiddleware<T>(route: RouteMetadata): Array<Middleware<T>> {
  const routeAnnotations = (route.controllerAnnotations ?? []).concat(
      route.methodAnnotations ?? []
    ),
    earlyMiddleware = routeAnnotations
      .filter((x) => x.middlewarePriority === MiddlewarePriority.BeforeBodyParser)
      .map((x) => x.middleware),
    bodyParser = routeAnnotations.find((x) => x.isBodyParser)?.middleware || defaultParser,
    middleware = routeAnnotations.filter((x) => isRegularMiddleware(x)).map((x) => x.middleware)

  return [...earlyMiddleware, bodyParser, ...middleware]
}

/**
 * Handler Factory,
 * Given the route metadata, compile a handler (optimization boundary)
 * Executed once per route.
 */
export function createHandler(route: RouteMetadata, typeResolver: TypeResolver): Middleware<any> {
  return compose(...resolvePreRouteMiddleware(route), resolveRouteMiddleware(route, typeResolver))
}
