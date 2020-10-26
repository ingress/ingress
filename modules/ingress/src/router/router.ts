import { Middleware } from 'app-builder'
import { reflectAnnotations, AnnotatedPropertyDescription } from 'reflect-annotations'
import { parse as parseUrl } from 'url'
import RouteRecognizer, { Results } from 'route-recognizer'
import { createHandler, Handler } from './handler'
import { TypeConverter, defaultTypeConverters, Type } from './type-converter'
import { ControllerCollector, ControllerDependencyCollector } from './controller-annotation'
import { BaseContext } from '../context'
import { Func } from '../lang'

//Exports
export { ParseJson } from './json-parser'
export { ParseOptions, Parse, ParseAnnotation } from './parse.annotation'
export * from './route.annotation'
export { RouteMetadata } from './path-resolver'
export { ExactTypeConverter, PredicateTypeConverter, TypeConverter } from './type-converter'
export { Type, Handler }

export interface RouterOptions {
  controllers?: Array<Type<any>>
  baseUrl?: string
  typeConverters?: TypeConverter<any>[]
}

const defaultOptions: RouterOptions = {
  typeConverters: [],
}

export class Router<T extends BaseContext<any, any>> {
  private routers: { [key: string]: RouteRecognizer }
  private options: RouterOptions
  private initialized = false

  public controllerCollector = new ControllerCollector()
  public controllers: Type<any>[] = []
  public handlers: Handler[] = []
  /**
   * Load decorated class as a Controller into the app
   */
  public Controller: ControllerDependencyCollector = this.controllerCollector.collect
  public readonly typeConverters: TypeConverter<any>[]

  constructor(options: RouterOptions = {}) {
    this.options = Object.assign({}, defaultOptions, options)
    this.controllers.push(...(this.options.controllers || []))
    this.routers = {}
    if (this.options.typeConverters?.length) {
      this.typeConverters = this.options.typeConverters.slice()
    } else {
      this.typeConverters = defaultTypeConverters.slice()
    }
  }

  public handlesUpgrade(): boolean {
    return Boolean(this.routers.UPGRADE)
  }

  start(): Promise<any> {
    if (this.initialized) {
      return Promise.resolve()
    }
    const { baseUrl } = this.options,
      controllers = Array.from(new Set([...this.controllerCollector.items, ...this.controllers]))

    this.handlers.push(
      ...controllers
        .reduce<AnnotatedPropertyDescription[]>(
          (routes, controller) =>
            routes.concat(
              ...reflectAnnotations(controller).map((x) => Object.assign(x, { controller }))
            ),
          []
        )
        .map((route: any) => {
          const handler = createHandler(route, baseUrl, this.typeConverters)
          for (const [method, paths] of Object.entries(handler.paths)) {
            const router = this.routers[method] || new RouteRecognizer()
            for (const path of paths) {
              router.add([{ handler, path }])
            }
            this.routers[method] = router
          }
          return handler
        })
    )
    this.initialized = true
    return Promise.resolve()
  }

  public match(method: string, pathname: string): Results | undefined {
    const router = this.routers[method.toUpperCase()]
    return router && router.recognize(pathname)
  }

  get middleware(): Middleware<T> {
    return (context: T, next: Func<Promise<any>>): Promise<any> => {
      const req = context.req,
        url = context.route.url || (context.route.url = parseUrl(req.url ?? '')),
        route =
          req.method && url.pathname && this.match(req.method, url.pathname + (url.search ?? '')),
        match = route && route[0],
        handler = match && (match.handler as Handler),
        event = { context }
      if (!route || !match || !handler) {
        context.res.statusCode = 404
        context.emit('before-route', event)
        context.emit('after-route', event)
        return next()
      }
      context.route = Object.assign(context.route, {
        handler,
        controllerInstance: context.scope.get(handler.controller),
        parserResult: null,
      })
      context.res.statusCode = 200
      context.route.query = (route as any).queryParams || Object.create(null)
      context.route.params = match.params || Object.create(null)
      context.emit('before-route', event)
      return handler.invokeAsync(context, () => {
        context.emit('after-route', event)
        return next()
      })
    }
  }
}
