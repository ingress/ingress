import ingress, { IngressApp, Context } from './app.js'
import { Route } from './router/router.js'
import {
  Ingress,
  ListenOptions,
  Addon,
  Usable,
  SetupTeardown,
  AppState,
  usableForwardRef,
} from './ingress.js'

export default ingress
export { IngressApp, Route, Ingress, Context, AppState }
export { ListenOptions, Addon, Usable, SetupTeardown, usableForwardRef }
export { StatusCode } from '@ingress/http-status'

export { BaseContext, DefaultContext, BaseAuthContext, Request, Response, Type } from './context.js'

export { Authenticate } from './annotations/authenticate.js'
export { fromConnect } from './annotations/from-connect.js'
export { AfterRequest } from './annotations/after-request.js'

export { compose } from 'app-builder'

//SOMEDAY: alias this
export { createAnnotationFactory } from 'reflect-annotations'

export * from './websocket/namespace.js'
export * from './websocket/upgrade.js'
export * from './websocket/backchannel.js'

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
  UpgradeRouteAnnotation,
  Upgrade,
  RouteParamAnnotation,
  TypeConverter,
  PredicateTypeConverter,
  ExactTypeConverter,
  ParamAnnotation,
  RouteMetadata,
} from './router/router.js'
