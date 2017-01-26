import { reflectAnnotations, AnnotatedPropertyDescription } from 'reflect-annotations'
import RouteRecognizer = require('route-recognizer')
import { Middleware as GenericMiddleware } from 'app-builder'
import { IncomingMessage, ServerResponse } from 'http'
import {
  createHandler,
  Handler,
  isRoutable as isExplictlyRoutable,
  RouteMetadata
} from './handler'
import { parse as parseUrl, Url } from 'url'
import { parse as parseQuery } from 'querystring'
import { Type } from './type'
import { ControllerCollector, ControllerDecorator } from './controller'
import { RouterContext } from './context'

export interface RouterOptions<T> {
  controllers?: Array<Type<any>>,
  resolveController?<C> (context: T, controller: Type<C>): C
  baseUrl?: string
  isRoutable?: (routeDefinition: RouteMetadata) => boolean
  getMethods?: (routeDefinition: RouteMetadata) => string[]
  getPath?: (baseUrl: string, routeDefinition: RouteMetadata) => string
}

export interface Middleware<T extends RouterContext<T>> {
  (context: T, next: GenericMiddleware<T>): any
}

const defaultOptions = {
  resolveController (ctx: any, ctrl: Type<any>) {
    if (ctx.scope && typeof ctx.scope.get === 'function') {
      this.resolveController = (context: any, controller: Type<any>) => context.scope.get(controller)
      return this.resolveController(ctx, ctrl)
    }
    this.resolveController = (_: any, controller: Type<any>) => new controller()
    return this.resolveController(ctx, ctrl)
  }
}

export class Router<T extends RouterContext<T>> {

  private routers: { [key: string]: RouteRecognizer<Handler<T>> }
  private _options: RouterOptions<T>
  private _initialized = false
  private _controllerCollector = new ControllerCollector()

  public handlers: Handler<T>[]
  public Controller: ControllerDecorator = this._controllerCollector.collect

  constructor (options: RouterOptions<T> = { resolveController: defaultOptions.resolveController }) {
    this._options = Object.assign({}, defaultOptions, options)
    this.routers = {}
  }

  _initialize () {
    if (this._initialized) {
      return
    }
    this._initialized = true

    const { isRoutable, baseUrl, getPath, getMethods } = this._options,
      controllers = this._controllerCollector.collected.concat(this._options.controllers || [])

    this.handlers = controllers
      .reduce((routes: AnnotatedPropertyDescription[], controller) => routes
        .concat(...reflectAnnotations(controller)
        .map(x => Object.assign(x, { controller }))
        .filter(isRoutable || isExplictlyRoutable))
      , [])
      .map((route: RouteMetadata) => {
        const handler = createHandler(route, baseUrl, getPath, getMethods)
        handler.httpMethods.forEach(method => {
          const recognizer = this.routers[method] = this.routers[method]
            || new RouteRecognizer<Handler<T>>()
          recognizer.add([handler])
        })
        return handler
      })
  }

  _match (method: string, pathname: string) {
    const router = this.routers[method],
      route = (router && router.recognize(pathname) || [])[0]
    return <{ handler: Handler<T>, params: {[key: string]: string} }> route
  }

  middleware (): Middleware <T> {
    this._initialize()
    return (context, next) => {
      const
        req = context.req,
        url = context.url = parseUrl(req.url || ''),
        route = req.method && url.pathname && this._match(req.method, url.pathname),
        handler = route && route.handler

      if (!route || !handler) {
        context.res.statusCode = 404
        return next()
      }
      if (this._options.resolveController) {
          context.router = {
          controller: this._options.resolveController(context, handler.controller),
          bodyResult: null
        }
      }
      context.res.statusCode = 200
      context.req.query = url.search && parseQuery(url.search.slice(1))
      context.req.params = route.params

      return handler.invokeAsync(context, next)
    }
  }
}

export * from './annotations'
export { createAnnotationFactory } from 'reflect-annotations'
export * from './context'
export {
  isRoutable,
  getMethods,
  getPath
} from './handler'
export { ParseBody } from './body-parser'
