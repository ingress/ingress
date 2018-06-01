import { compose, Middleware, ComposedMiddleware } from 'app-builder'
import { AnnotatedPropertyDescription } from 'reflect-annotations'
import { parseJsonBody } from './json-body-parser'
import { RouteAnnotation, ParamAnnotation } from './annotations'
import { RouterContext } from './context'
import { Type } from './type'
import { TypeConverter, ExactTypeConverter } from './index'
import { createInflateRaw } from 'zlib'

export type RouteMetadata = AnnotatedPropertyDescription & { controller: Type<any> }

const supportedHttpMethods: Array<string> = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
  isRouteAnnotation = (x: any) => x.isRouteAnnotation,
  pickRequest = (context: RouterContext<any>) => context.req

export type PathResolver = typeof getPaths

export function getPaths(baseUrl = '/', route: RouteMetadata): { [method: string]: string[] } {
  const parents = route.classAnnotations.filter(isRouteAnnotation) as RouteAnnotation[],
    children = route.methodAnnotations.filter(isRouteAnnotation) as RouteAnnotation[],
    paths: { [method: string]: string[] } = {}

  let resolveFrom = '/'

  if (parents.length) {
    resolveFrom = baseUrl
  } else {
    parents.push(new RouteAnnotation(baseUrl))
  }

  parents.forEach(parent => {
    children.forEach(child => {
      if (!child.methods.length && !parent.methods.length) {
        throw new Error(`${route.controller.name}.${route.name} has no Http Method defined`)
      }
      if (child.methods.length && parent.methods.length) {
        throw new Error(
          `${route.controller.name}.${
            route.name
          } must provide Http Methods on class OR method, but not both`
        )
      }
      const methods = parent.methods.length ? parent.methods : child.methods,
        resolvedPath = parent.resolvePath(resolveFrom, child)

      methods.forEach(m => {
        paths[m] = paths[m] || []
        paths[m].push(resolvedPath)
      })
    })
  })

  return paths
}

export function isRoutable(maybeRoute: AnnotatedPropertyDescription) {
  const annotations = maybeRoute.classAnnotations.concat(maybeRoute.methodAnnotations),
    hasMethod = annotations.some(x => x.isRouteAnnotation),
    hasRoute = annotations.some(x => x.isHttpMethodAnnotation)
  return Boolean(hasMethod && hasRoute)
}

function extractMiddleware<T>(route: RouteMetadata): Array<Middleware<T>> {
  return route.classAnnotations
    .concat(route.methodAnnotations)
    .filter(x => !x.isBodyParser && 'middleware' in x)
    .map(x => x.middleware)
}

function extractBodyParser(route: RouteMetadata) {
  const bodyParser = route.classAnnotations
    .concat(route.methodAnnotations)
    .find(x => x.isBodyParser)

  return bodyParser ? bodyParser.middleware : parseJsonBody
}

function resolveParameters(params: ParamResolver[], context: RouterContext<any>) {
  const resolvedParameters: any[] = []
  for (let i = 0; i < params.length; i++) {
    const resolver = params[i]
    resolvedParameters[i] = resolver(context)
  }
  return resolvedParameters
}

function extractParameter(annotation: any): ParamResolver {
  const isParamAnnotation = annotation && (annotation as ParamAnnotation).extractValue
  if (!isParamAnnotation) {
    return pickRequest
  }
  return context => (annotation as ParamAnnotation).extractValue!(context)
}

export interface ParamResolver {
  (context: RouterContext<any>): any
}

function isExactTypeConverter<T>(converter: TypeConverter<T>): converter is ExactTypeConverter<T> {
  return 'type' in converter
}

function resolveRouteMiddleware<T extends RouterContext<T>>(handler: {
  controllerMethod: string
  controller: Type<any>
  paramResolvers: ParamResolver[]
}) {
  const routeName = handler.controllerMethod,
    controllerMethod = handler.controller.prototype[routeName],
    paramResolvers = handler.paramResolvers

  return (context: T, next: () => Promise<any>) => {
    const params = resolveParameters(paramResolvers, context)
    return Promise.resolve(controllerMethod.call(context.route.controllerInstance, ...params)).then(
      x => {
        context.body = x
        return next()
      }
    )
  }
}

function convertType(
  paramResolver: ParamResolver,
  paramIndex: number,
  source: RouteMetadata,
  typeConverters: TypeConverter<any>[]
): ParamResolver {
  const paramType = source.types.parameters && source.types.parameters[paramIndex]
  if (!paramType || paramType === Object) {
    return paramResolver
  }
  const typeConverter =
    paramType &&
    typeConverters.find(
      (c: TypeConverter<any>) =>
        isExactTypeConverter(c) ? c.type === paramType : c.typePredicate(paramType)
    )
  if (!typeConverter) {
    throw new Error(`no type converter found for type: ${paramType.name || paramType}`)
  }
  return context => {
    const value = paramResolver(context)
    return typeConverter.convert(value, paramType)
  }
}

function withPath<T>(this: Handler<T>, path: string) {
  return { ...this, path }
}

export interface Handler<T> {
  path: string
  handler: Handler<T>
  invokeAsync: (context: T, next: () => Promise<any>) => Promise<any>
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

export function createHandler<T extends RouterContext<T>>(
  source: RouteMetadata,
  baseUrl: string = '/',
  derivePaths: (baseUrl: string, route: RouteMetadata) => { [method: string]: string[] } = getPaths,
  typeConverters: TypeConverter<any>[]
) {
  const paths = derivePaths(baseUrl, source),
    paramAnnotations = source.parameterAnnotations.length
      ? source.parameterAnnotations
      : [undefined],
    paramResolvers = paramAnnotations
      .map(extractParameter)
      .map((x, i) => convertType(x, i, source, typeConverters))

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
    invokeAsync: compose<T>([
      extractBodyParser(source),
      ...extractMiddleware<T>(source),
      resolveRouteMiddleware({
        controller: source.controller,
        controllerMethod: source.name,
        paramResolvers
      })
    ]),
    handler: handlerRef as Handler<T> // hack for defining circular literal
  }
  handler.handler = handler
  return handler
}
