import { compose, Middleware } from 'app-builder'
import { defaultTypeConverters, TypeConverter, Func } from './type-converter.js'
import type { RouteMetadata } from './route-resolve.js'
import type { RouterContext } from './router.js'

enum MiddlewarePriority {
  'BeforeBodyParser' = 'BeforeBodyParser',
}

export function defaultParser(context: RouterContext, next: () => Promise<any>): Promise<any> {
  return context.parse({ mode: 'auto' }).then((x: any) => {
    context.route!.body = x
    return next()
  })
}

export function resolveRouteMiddleware<T>(
  route: RouteMetadata,
  typeConverters: TypeConverter<any>[] = defaultTypeConverters
): Middleware<T> {
  const method = route.parent.prototype[route.name] || (route.parent as any)[route.name],
    createController = (context: any) => context.scope.get(route.parent),
    resolveArgs = createParamsResolver(route, typeConverters)

  return (context: any, next: any) => {
    const controller = createController(context),
      args = resolveArgs(context),
      setBody = (body: any) => {
        context.body = body
        return next()
      }
    if ('then' in args) {
      return args.then((resolvedArgs) => method.apply(controller, resolvedArgs)).then(setBody)
    }
    return Promise.resolve(method.apply(controller, args)).then(setBody)
  }
}

const pickRequest = (context: any) => context.req

/**
 * Get a function that resolves route parameter metadata to arguments for the route
 * @param route
 * @param typeConverters
 * @returns a function that resolves arguments for the route
 */
function createParamsResolver(
  route: RouteMetadata,
  typeConverters: TypeConverter<any>[] = defaultTypeConverters
) {
  const paramLength = route.types.parameters?.length || 0,
    resolvers: Func[] = []

  for (let i = 0; i < paramLength; i++) {
    const annotation = route.parameterAnnotations[i],
      type = route.types?.parameters?.[i],
      pick =
        annotation?.extractValue?.bind(annotation) || type?.extractValue?.bind(type) || pickRequest
    if (!type && !annotation) {
      resolvers.push(pick)
      continue
    }
    if (URLSearchParams === type) {
      //no annotation allowed on type annotation of URLSearchParams
      resolvers.push((context) => context.route.query)
      continue
    }

    if ('transformValue' in type) {
      resolvers.push((context) => type.transformValue(pick(context)))
      continue
    }
    let resolver: any = undefined
    for (const c of typeConverters) {
      if (('type' in c && c.type === type) || ('typePredicate' in c && c.typePredicate(type))) {
        resolver = (context: any) => c.convert(pick(context))
        break
      }
    }

    if (!resolver) {
      throw new Error(
        `No type converter found for: ${route.parent.name}.${route.name} at parameter ${i}:${
          type.name || type
        }`
      )
    }
  }

  const l = resolvers.length
  //hot path ...generate function?
  return function paramResolver(context: any) {
    const args = []
    let isAsync = false
    for (let i = 0; i < l; i++) {
      const resolved = resolvers[i](context)
      if (resolved && 'then' in resolved) {
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
  return !x.isBodyParser && 'middleware' in x && x.priority !== MiddlewarePriority.BeforeBodyParser
}

function resolvePreRouteMiddleware<T>(route: RouteMetadata): Array<Middleware<T>> {
  const routeAnnotations = route.classAnnotations.concat(route.methodAnnotations),
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
export function createHandler(route: RouteMetadata): Middleware<any> {
  return compose(...resolvePreRouteMiddleware(route), resolveRouteMiddleware(route))
}
