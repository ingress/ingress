import { compose, Middleware } from 'app-builder'
import { AnnotatedPropertyDescription } from 'reflect-annotations'
import { parseJsonBody } from './json-parser'
import { BaseContext } from '../context'
import { ParamAnnotation } from './route-annotation'
import { Type } from './controller-annotation'
import { TypeConverter, ExactTypeConverter } from './type-converter'
import { resolvePaths, RouteMetadata } from './path-resolver'

const pickRequest = (context: BaseContext<any, any>) => context.req

enum MiddlewarePriority {
  'BeforeBodyParser' = 'BeforeBodyParser',
}

export function isRoutable(maybeRoute: AnnotatedPropertyDescription) {
  const annotations = maybeRoute.classAnnotations.concat(maybeRoute.methodAnnotations),
    hasMethod = annotations.some((x) => x.isRouteAnnotation),
    hasRoute = annotations.some((x) => x.isHttpMethodAnnotation)
  return Boolean(hasMethod && hasRoute)
}

function isRegularMiddleware(x: any) {
  return !x.isBodyParser && 'middleware' in x && x.priority !== MiddlewarePriority.BeforeBodyParser
}

function extractEarlyMiddleware<T>(route: RouteMetadata): Array<Middleware<T>> {
  return route.classAnnotations
    .concat(route.methodAnnotations)
    .filter((x) => x.middlewarePriority === MiddlewarePriority.BeforeBodyParser)
    .map((x) => x.middleware)
}

function extractMiddleware<T>(route: RouteMetadata): Array<Middleware<T>> {
  return route.classAnnotations
    .concat(route.methodAnnotations)
    .filter((x) => isRegularMiddleware(x))
    .map((x) => x.middleware)
}

function extractBodyParser(route: RouteMetadata) {
  const bodyParser = route.classAnnotations.concat(route.methodAnnotations).find((x) => x.isBodyParser)
  return bodyParser ? bodyParser.middleware : parseJsonBody
}

function resolveParameters(params: ParamResolver[], context: BaseContext<any, any>) {
  const resolvedParameters: any[] = []
  for (let i = 0; i < params.length; i++) {
    const resolver = params[i]
    resolvedParameters[i] = resolver(context)
  }
  return Promise.all(resolvedParameters)
}

function extractParameter(annotation: ParamAnnotation): ParamResolver {
  if (!annotation?.extractValue) {
    return pickRequest
  }
  return (context) => (annotation as any).extractValue(context)
}

export interface ParamResolver {
  (context: BaseContext<any, any>): any
}

function resolveRouteMiddleware<T extends BaseContext<any, any>>(handler: {
  controllerMethod: string
  controller: Type<any>
  paramResolvers: ParamResolver[]
}) {
  const routeName = handler.controllerMethod,
    controllerMethod = handler.controller.prototype[routeName],
    paramResolvers = handler.paramResolvers

  return async (context: T, next: () => Promise<any>) => {
    let params: any[]
    try {
      params = await resolveParameters(paramResolvers, context)
    } catch (e) {
      e.statusCode = e.statusCode || 400
      throw e
    }
    context.body =
      context.body || (await Promise.resolve(controllerMethod.call(context.route.controllerInstance, ...params)))
    return next()
  }
}

export function convertType(
  paramResolver: ParamResolver,
  paramIndex: number,
  source: RouteMetadata,
  typeConverters: TypeConverter<any>[]
): ParamResolver {
  const paramType = source.types.parameters && source.types.parameters[paramIndex]
  if (!paramType) {
    return paramResolver
  }
  let typeConverter: TypeConverter<any> | undefined = undefined
  for (const c of typeConverters) {
    if (('type' in c && c.type === paramType) || ('typePredicate' in c && c.typePredicate(paramType))) {
      typeConverter = c
      break
    }
  }

  if (!typeConverter) {
    throw new Error(
      `No type converter found for: ${source.controller.name}.${source.name} at ${paramIndex}${
        paramType.name || paramType
      }`
    )
  }
  return (context) => {
    const value = paramResolver(context)
    return typeConverter?.convert(value, paramType)
  }
}

export function withPath(this: Handler, path: string) {
  return { ...this, path }
}

export interface Handler {
  path: string
  handler: Handler
  invokeAsync: Middleware<any>
  withPath: typeof withPath
  source: RouteMetadata
  baseUrl: string
  convertType: typeof convertType
  paths: { [method: string]: string[] }
  typeConverters: TypeConverter<any>[]
  controller: Type<any>
  controllerMethod: string
  paramAnnotations: ParamAnnotation[]
  paramResolvers: ParamResolver[]
}

export function createHandler(source: RouteMetadata, baseUrl = '/', typeConverters: TypeConverter<any>[]) {
  const paths = resolvePaths(baseUrl, source),
    paramAnnotations = source.parameterAnnotations.length ? source.parameterAnnotations : [undefined],
    paramResolvers = paramAnnotations.map(extractParameter).map((x, i) => convertType(x, i, source, typeConverters))

  let handlerRef: any
  const handler = {
    path: '',
    withPath,
    source,
    baseUrl,
    convertType,
    paths,
    typeConverters,
    controller: source.controller,
    controllerMethod: source.name,
    paramAnnotations,
    paramResolvers,
    invokeAsync: compose([
      ...extractEarlyMiddleware(source),
      extractBodyParser(source),
      ...extractMiddleware(source),
      resolveRouteMiddleware({
        controller: source.controller,
        controllerMethod: source.name,
        paramResolvers,
      }),
    ]),
    handler: handlerRef as Handler,
  }
  handler.handler = handler
  return handler
}
