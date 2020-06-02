//API
import ingress, { IngressApp, Context } from './app'
import { Route } from './router/router'
import { Ingress, ListenOptions, Addon, Usable, SetupTeardown } from './ingress'

export default ingress
export { IngressApp, Route, Ingress, Context }
export { ListenOptions, Addon, Usable, SetupTeardown }

//Supporting Symbols
export { BaseContext, DefaultContext, BaseAuthContext, Request, Response } from './context'
export { Authenticate } from './annotations/authenticate'
export { fromConnect } from './annotations/from-connect'
export { AfterRequest } from './annotations/after-request'
export { compose } from 'app-builder'

//SOMEDAY: alias this
export { createAnnotationFactory } from 'reflect-annotations'

export {
  PathFactory,
  Handler,
  Body,
  Header,
  Parse,
  Path,
  Query,
  ParseOptions,
  ParseAnnotation,
  HeaderParamAnnotation,
  RouteParamAnnotation,
  Type,
  TypeConverter,
  PredicateTypeConverter,
  ExactTypeConverter,
  ParamAnnotation,
  RouteMetadata,
} from './router/router'
