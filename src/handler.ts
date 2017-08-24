import { compose, Middleware } from 'app-builder'
import { AnnotatedPropertyDescription } from 'reflect-annotations'
import { parseJsonBody } from './body-parser'
import { RouteAnnotation, ParamAnnotation } from './annotations'
import { RouterContext } from './context'
import { Type } from './type'
import { TypeConverter, ExactTypeConverter } from './index'

export type RouteMetadata = AnnotatedPropertyDescription & { controller: Type<any> }

const supportedHttpMethods: Array<string> = ['GET','POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
  isRouteAnnotation = (x: any) => x.isRouteAnnotation,
  pickRequest = (context:RouterContext<any>) => context.req

export function getPath (baseUrl = '/', route: RouteMetadata): string {
  const parent = route.classAnnotations.find(isRouteAnnotation) as RouteAnnotation | undefined,
    child = route.methodAnnotations.find(isRouteAnnotation) as RouteAnnotation | undefined

  return parent && parent.resolvePath(baseUrl, child)
    || new RouteAnnotation(baseUrl).resolvePath('/', child)
}

export function getMethods (route: RouteMetadata): string[] {
  return Array.from(
      new Set(route.classAnnotations.concat(route.methodAnnotations)
        .filter(x => x.isHttpMethodAnnotation)
        .map(x => <string[]>x.methods)
        .reduce((a, c) => a.concat(c) ,[])
      )
    )
}

export function isRoutable (maybeRoute: AnnotatedPropertyDescription) {
  const annotations = maybeRoute.classAnnotations.concat(maybeRoute.methodAnnotations),
    hasMethod = annotations.some(x => x.isRouteAnnotation),
    hasRoute = annotations.some(x => x.isHttpMethodAnnotation)
  return Boolean(hasMethod && hasRoute)
}

function extractMiddleware<T>(route: RouteMetadata): Array<Middleware<T>> {
  return route.classAnnotations
    .concat(route.methodAnnotations)
    .filter((x) => !x.isBodyParser && 'middleware' in x)
    .map(x => x.middleware)
}

function extractBodyParser (route: RouteMetadata) {
  const bodyParser = route.classAnnotations
      .concat(route.methodAnnotations)
      .find(x => x.isBodyParser)

  return bodyParser ? bodyParser.middleware : parseJsonBody
}

function resolveParameters (params: ParamResolver[], context: RouterContext<any>) {
  const resolvedParameters: any[] = []
  for (let i = 0; i < params.length; i++) {
    const resolver = params[i]
    resolvedParameters[i] = resolver(context)
  }
  return resolvedParameters
}

function extractParameter (annotation: any): ParamResolver {
  const isParamAnnotation = annotation && (annotation as ParamAnnotation).extractValue
  if (!isParamAnnotation) {
    return pickRequest
  }
  return context => (annotation as ParamAnnotation).extractValue!(context)
}

export interface ParamResolver {
  (context: RouterContext<any>): any
}

function isExactTypeConverter<T> (converter: TypeConverter<T>): converter is ExactTypeConverter<T> {
  return 'type' in converter
}

export class Handler<T extends RouterContext<T>> {
  public handler: Handler<T>
  public controllerMethod: string
  public controller: Type<any>
  public invokeAsync: Middleware<T>
  private paramAnnotations: any[]
  private paramResolvers: ParamResolver[]

  constructor (
      public source: RouteMetadata,
      public baseUrl: string,
      public path: string,
      public httpMethods: string[],
      public typeConverters: TypeConverter<any>[]
    ) {
    this.handler = this
    this.controller = source.controller
    this.controllerMethod = source.name

    this.paramAnnotations = this.source.parameterAnnotations.length
        ? this.source.parameterAnnotations : [undefined]

    this.paramResolvers = this.paramAnnotations
      .map(extractParameter)
      .map((x, i) => this.convertType(x, i))

    this.invokeAsync = compose([
      extractBodyParser(source),
      ...extractMiddleware(source),
      this._resolveRouteMiddleware()
    ])
  }

  convertType (paramResolver: ParamResolver, paramIndex: number): ParamResolver {
    const paramType = this.source.types.parameters && this.source.types.parameters[paramIndex]
    if (!paramType || paramType === Object) {
      return paramResolver
    }
    const typeConverter = paramType && this.typeConverters.find(c => isExactTypeConverter(c) ? c.type === paramType : c.typePredicate(paramType))
    if (!typeConverter) {
      throw new Error(`no type converter found for type: ${paramType.name || paramType}`)
    }
    return (context) => {
      const value = paramResolver(context)
      return typeConverter.convert(value)
    }
  }

  _resolveRouteMiddleware () {
    const routeName = this.controllerMethod,
      controllerMethod = this.controller.prototype[routeName],
      paramResolvers = this.paramResolvers

    return (context: T, next: () => Promise<any>) => {
      const params = resolveParameters(paramResolvers, context)

      return Promise.resolve(controllerMethod.apply(context.route.controllerInstance, params))
        .then(x => {
          context.body = x
          return next()
        })
    }
  }
}

export function createHandler<T extends RouterContext<T>> (
  source: RouteMetadata,
  baseUrl: string = '/',
  derivePath: (baseUrl: string, route: RouteMetadata) => string = getPath,
  deriveMethods: (route: RouteMetadata) => string[] = getMethods,
  typeConverters: TypeConverter<any>[]
    ) {
  return new Handler<T>(source, baseUrl, derivePath(baseUrl, source), deriveMethods(source), typeConverters)
}
