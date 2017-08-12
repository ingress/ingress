import { compose, Middleware } from 'app-builder'
import { AnnotatedPropertyDescription } from 'reflect-annotations'
import { parseJsonBody } from './body-parser'
import { RouteAnnotation, ParamAnnotation } from './annotations'
import { RouterContext } from './context'
import { Type } from './type'

export type RouteMetadata = AnnotatedPropertyDescription & { controller: Type<any> }

const supportedHttpMethods: Array<string> = ['GET','POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
  isRouteAnnotation = (x: any) => x.isRouteAnnotation

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

export class Handler<T extends RouterContext<T>> {
  public handler: Handler<T>
  public controllerMethod: string
  public controller: Type<any>
  public invokeAsync: Middleware<T>

  constructor (
      public source: RouteMetadata,
      public baseUrl: string,
      public path: string,
      public httpMethods: string[]
    ) {
    this.handler = this
    this.controller = source.controller
    this.controllerMethod = source.name
    this.invokeAsync = compose([
      extractBodyParser(source),
      ...extractMiddleware(source),
      this._resolveRouteMiddleware()
    ])
  }

  _resolveMethodParameters (context: RouterContext<any>) {
    const paramAnnotations = this.source.parameterAnnotations.length ? this.source.parameterAnnotations : [undefined],
      resolvedParameters: any[] = []
    for (let i = 0; i < paramAnnotations.length; i++) {
      const annotation = paramAnnotations[i]
      if (annotation && (annotation as ParamAnnotation).extractValue) {
        resolvedParameters[i] = (annotation as ParamAnnotation).extractValue(context)
      } else {
        resolvedParameters[i] = context.req
      }
    }
    return resolvedParameters
  }

  _resolveRouteMiddleware () {
    const routeName = this.controllerMethod
    return (context: T, next: () => Promise<any>) => {
      const controllerMethod = context.route.controllerInstance[routeName],
        params = this._resolveMethodParameters(context)

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
  deriveMethods: (route: RouteMetadata) => string[] = getMethods
    ) {
  return new Handler<T>(source, baseUrl, derivePath(baseUrl, source), deriveMethods(source))
}
