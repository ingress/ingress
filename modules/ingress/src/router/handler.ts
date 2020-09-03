import { compose, Middleware } from 'app-builder'
import { AnnotatedPropertyDescription } from 'reflect-annotations'
import { parseJson } from './json-parser'
import { BaseContext } from '../context'
import { ParamAnnotation } from './route.annotation'
import { Type } from '@ingress/di'
import { TypeConverter } from './type-converter'
import { resolvePaths, RouteMetadata } from './path-resolver'

const pickRequest = (context: BaseContext<any, any>) => context.req

enum MiddlewarePriority {
  'BeforeBodyParser' = 'BeforeBodyParser',
}

export function isRoutable(maybeRoute: AnnotatedPropertyDescription): boolean {
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
  const bodyParser = route.classAnnotations
    .concat(route.methodAnnotations)
    .find((x) => x.isBodyParser)
  return bodyParser ? bodyParser.middleware : parseJson
}

function resolveParameters(params: ParamResolver[], context: BaseContext<any, any>) {
  const resolvedParameters: any[] = []
  for (let i = 0; i < params.length; i++) {
    const resolver = params[i]
    resolvedParameters[i] = resolver(context)
  }
  return Promise.all(resolvedParameters)
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
    const result = await Promise.resolve(
      controllerMethod.call(context.route.controllerInstance, ...params)
    )
    if (result !== undefined) {
      context.body = result
    }
    return next()
  }
}

/**
 * @public
 */
export interface Handler {
  path: string
  handler: Handler
  invokeAsync: Middleware<any>
  source: RouteMetadata
  baseUrl: string
  paths: { [method: string]: string[] }
  controller: Type<any>
  controllerMethod: string
  paramAnnotations: ParamAnnotation[]
}

function createParamResolver(
  source: RouteMetadata,
  annotation: ParamAnnotation | undefined,
  index: number,
  typeConverters: TypeConverter<any>[]
): ParamResolver {
  const paramType = source.types?.parameters?.[index],
    pick =
      annotation?.extractValue?.bind(annotation) ||
      paramType?.extractValue?.bind(paramType) ||
      pickRequest

  if (!annotation && !paramType) {
    return pick
  }

  if ('convert' in paramType) {
    return (context) => paramType.convert(pick(context))
  }

  let typeConverter: TypeConverter<any> | undefined = undefined
  for (const c of typeConverters) {
    if (
      ('type' in c && c.type === paramType) ||
      ('typePredicate' in c && c.typePredicate(paramType))
    ) {
      typeConverter = c
      break
    }
  }

  if (!typeConverter) {
    throw new Error(
      `No type converter found for: ${source.controller.name}.${
        source.name
      } at parameter ${index}:${paramType.name || paramType}`
    )
  }
  const converter = typeConverter

  return (context) => {
    const value = pick(context)
    return converter.convert(value, paramType)
  }
}

export function createHandler(
  source: RouteMetadata,
  baseUrl = '/',
  typeConverters: TypeConverter<any>[]
): Handler {
  const paths = resolvePaths(baseUrl, source),
    paramAnnotations: ParamAnnotation[] = Array.from(
      Array(source.types.parameters?.length),
      (x, i) => {
        return source.parameterAnnotations[i] || undefined
      }
    ),
    paramResolvers = paramAnnotations.map((annotation, index) =>
      createParamResolver(source, annotation, index, typeConverters)
    )
  let handlerRef: any
  const handler = {
    path: '',
    source,
    baseUrl,
    paths,
    controller: source.controller,
    controllerMethod: source.name,
    paramAnnotations,
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
