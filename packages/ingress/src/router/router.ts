import type { Middleware } from 'app-builder'
import { reflectAnnotations, AnnotatedPropertyDescription } from 'reflect-annotations'
import { parse as parseUrl } from 'url'
import createRecognizer, { HTTPMethod } from 'find-my-way'
import { createHandler, Handler } from './handler.js'
import { TypeConverter, defaultTypeConverters, Type } from './type-converter.js'
import { ControllerCollector, ControllerDependencyCollector } from './controller-annotation.js'
import type { BaseContext } from '../context.js'
import { Func, noop } from '../lang.js'

//Exports
export { ParseJson } from './json-parser.js'
export { ParseOptions, Parse, ParseAnnotation } from './parse.annotation.js'
export * from './route.annotation.js'
export { RouteMetadata } from './path-resolver.js'
export { ExactTypeConverter, PredicateTypeConverter, TypeConverter } from './type-converter.js'
export { Type, Handler }

export interface RouterOptions {
  controllers?: Type<any>[]
  caseSensitive?: boolean
  baseUrl?: string
  typeConverters?: TypeConverter<any>[]
}

const defaultOptions: RouterOptions = {
  typeConverters: [],
}

export class Router<T extends BaseContext<any, any>> {
  private trie = createRecognizer()
  private options: RouterOptions
  private initialized = false

  public controllerCollector = new ControllerCollector()
  public controllers: Type<any>[] = []
  public handlers: Handler[] = []
  public handlesUpgrade = false
  /**
   * Load decorated class as a Controller into the app
   */
  public Controller: ControllerDependencyCollector = this.controllerCollector.collect
  public readonly typeConverters: TypeConverter<any>[]

  constructor(options: RouterOptions = {}) {
    this.options = Object.assign({}, defaultOptions, options)
    this.controllers.push(...(this.options.controllers || []))
    if (this.options.typeConverters?.length) {
      this.typeConverters = this.options.typeConverters.slice()
    } else {
      this.typeConverters = defaultTypeConverters.slice()
    }
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
            for (const path of paths) {
              this.trie.on(method as any, path, noop, handler)
            }
          }
          if (handler.upgrade) {
            this.handlesUpgrade = true
          }
          return handler
        })
    )
    this.initialized = true
    return Promise.resolve()
  }

  private match(
    method: string,
    pathname: string
  ): { handler: Handler; params: Record<string, string | undefined> } | null {
    const result = this.trie.find(method.toUpperCase() as HTTPMethod, pathname)
    if (result) {
      return { handler: result.store, params: result.params }
    }
    return null
  }

  get middleware(): Middleware<T> {
    return (context: T, next: Func<Promise<any>>): Promise<any> => {
      const req = context.req,
        url = context.route.url || (context.route.url = parseUrl(req.url ?? '')),
        route = req.method && url.pathname && this.match(req.method, url.pathname),
        event = { context }
      if (!route) {
        context.res.statusCode = 404
        context.emit('before-route', event)
        return Promise.resolve()
          .then(() => context.emit('after-route', event))
          .then(next)
      }
      const handler = route.handler
      context.route = Object.assign(context.route, {
        handler,
        controllerInstance: context.scope.get(handler.controller),
        parserResult: null,
      })
      context.res.statusCode = 200
      context.route.search = new URLSearchParams(url.search ?? undefined)

      //deprecated query map
      const queryMap = Object.create(null) as Record<string, string>
      if (url.search) {
        Array.from(context.route.search.entries()).reduce((obj, [key, value]) => {
          obj[key] = value
          return obj
        }, queryMap)
      }
      context.route.query = queryMap
      //end deprecated query map

      context.route.params = route.params || Object.create(null)
      context.emit('before-route', event)
      return handler.invokeAsync(context, () => {
        context.emit('after-route', event)
        return next()
      })
    }
  }
}
