import { compose, Middleware } from '@ingress/core'
import type { RouteMetadata } from './route-resolve.js'
import type { RouterContext } from './router.js'
import { Func, TypeResolver } from './type-resolver.js'

function isPrimitive(value: any) {
  return (typeof value !== 'object' && typeof value !== 'function') || value === null
}

export const MiddlewarePriority = {
  BeforeBodyParser: 'BeforeBodyParser',
}

export const DEFAULT_BODY_BYTES = 1.5e7

export function defaultParser(
  context: RouterContext,
  next: () => Promise<any>
): Promise<any> | void {
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
        //eslint-disable-next-line
        context.request.body = x
        return next()
      })
  }
}

export function resolveRouteMiddleware(route: RouteMetadata, typeResolver = new TypeResolver()) {
  const method = route.controller.prototype[route.name],
    createController = (context: any) => context.scope.get(route.controller),
    [shouldParseBody, resolveArgs] = createParamsResolver(route, typeResolver)

  return [
    shouldParseBody,
    (context: any, _next: any) => {
      const controller = createController(context),
        args = resolveArgs(context)

      if ('then' in args) {
        return args
          .then((resolvedArgs) => method.apply(controller, resolvedArgs))
          .then(context.send)
      }
      return method.apply(controller, args)
    },
  ] as const
}

const pickRequest = (context: any) => context.request

/**
 * Get a function that resolves route parameter metadata to arguments for the route
 * @param route
 * @param typeResolver
 * @returns a function that resolves arguments for the route
 */
function createParamsResolver(route: RouteMetadata, typeResolver: TypeResolver) {
  let parseBody = true
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

    if (Request === type) {
      parseBody = false
      resolvers.push(toRequest)
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
    const resolver = typeResolver.get(type)
    if (resolver) {
      resolvers.push((context: any) => resolver(pick(context)))
    }
    if (!resolver) {
      throw new Error(
        `No type converter found for: ${route.controller.name}.${route.name} at argument ${i}:${type.name}`
      )
    }
  }

  return [
    parseBody,
    function paramResolver(context: any): any[] | Promise<any[]> {
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
    },
  ] as const
}

function toRequest(ctx: RouterContext): Request {
  const protocol = ctx.request.protocol,
    headers: [string, string][] = []
  for (const [key, value] of Object.entries(ctx.request.headers)) {
    if (key && value) {
      headers.push([key, Array.isArray(value) ? value.join(',') : value])
    }
  }
  const method = ctx.request.method,
    body = method === 'GET' || method === 'HEAD' ? undefined : ctx.request.rawBody,
    url = protocol + ctx.request.headers['host'] + ctx.request.pathname + ctx.request.search
  return new Request(url, {
    body,
    method,
    headers,
  })
}

function isRegularMiddleware(x: any) {
  return !x.isBodyParser && 'middleware' in x && !(x.middlewarePriority in MiddlewarePriority)
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
  const routeAnnotations = (route.controllerAnnotations ?? []).concat(
      route.methodAnnotations ?? []
    ),
    earlyMiddleware = routeAnnotations
      .filter((x) => x.middlewarePriority === MiddlewarePriority.BeforeBodyParser)
      .map(getMiddleware),
    bodyParser = routeAnnotations.find((x) => x.isBodyParser)?.middleware || defaultParser,
    middleware = routeAnnotations.filter(isRegularMiddleware).map(getMiddleware),
    [shouldParseBody, routeMiddleware] = resolveRouteMiddleware(route, typeResolver)

  return compose(
    ...earlyMiddleware,
    ...(shouldParseBody ? [bodyParser] : []),
    ...middleware,
    routeMiddleware
  )
}
