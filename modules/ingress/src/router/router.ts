import { reflectAnnotations, AnnotatedPropertyDescription } from 'reflect-annotations'
import { Middleware } from 'app-builder'
import { createHandler, Handler } from './handler'
import { parse as parseUrl } from 'url'
import { TypeConverter, defaultTypeConverters } from './type-converter'
import { Type, ControllerCollector, ControllerDecorator } from './controller-annotation'
import { BaseContext } from '../context'
import RouteRecognizer = require('route-recognizer')

//Exports
export { ParseJsonBody } from './json-parser'
export { ParseBody } from './raw-parser'
export * from './route-annotation'
export { Type }

export interface RouterOptions {
  controllers?: Array<Type<any>>
  baseUrl?: string
  typeConverters?: TypeConverter<any>[]
}

const defaultOptions: RouterOptions = {
  typeConverters: []
}

export class RouterAddon<T extends BaseContext<any, any>> {
  private routers: { [key: string]: RouteRecognizer<Handler> }
  private options: RouterOptions
  private initialized = false

  public controllerCollector = new ControllerCollector()
  public controllers: Type<any>[] = this.controllerCollector.items
  public handlers: Handler[] = []
  public Controller: ControllerDecorator = this.controllerCollector.collect
  public readonly typeConverters: TypeConverter<any>[]

  constructor(options: RouterOptions = {}) {
    this.options = Object.assign({}, defaultOptions, options)
    this.controllers.push(...(this.options.controllers || []))
    this.routers = {}
    this.typeConverters = this.options.typeConverters!.concat(defaultTypeConverters)
  }

  register() {
    if (this.initialized) {
      return
    }

    const { baseUrl } = this.options,
      controllers = this.controllerCollector.items.concat(this.controllers)

    this.handlers.push(
      ...controllers
        .reduce<AnnotatedPropertyDescription[]>(
          (routes, controller) =>
            routes.concat(...reflectAnnotations(controller).map(x => Object.assign(x, { controller }))),
          []
        )
        .map((route: any) => {
          const handler = createHandler(route, baseUrl, this.typeConverters)
          Object.keys(handler.paths).forEach(method => {
            const recognizer = (this.routers[method] = this.routers[method] || new (RouteRecognizer as any)())
            handler.paths[method].forEach((path: string) => {
              recognizer.add([handler.withPath(path)])
            })
          })
          return handler
        })
    )
    this.initialized = true
  }

  private match(method: string, pathname: string) {
    const router = this.routers[method]
    return router && router.recognize(pathname)
  }

  get middleware(): Middleware<T> {
    return (context, next) => {
      const req = context.req,
        url = (context.route.url = parseUrl(req.url || '')),
        route = req.method && url.pathname && this.match(req.method, url.pathname),
        match = route && route[0],
        handler = match && (match.handler as Handler)

      if (!route || !match || !handler) {
        context.res.statusCode = 404
        return next()
      }

      context.route = Object.assign(context.route, {
        handler,
        controllerInstance: context.scope.get(handler.controller),
        parserResult: null
      })
      context.res.statusCode = 200
      context.route.query = (route as any).queryParams || Object.create(null)
      context.route.params = match.params || Object.create(null)

      return handler.invokeAsync(context, next)
    }
  }
}
