//API
import ingress, { IngressApp, Context } from './app'
import { Route } from './router/router'
import {
  Ingress,
  ListenOptions,
  Addon,
  Usable,
  SetupTeardown,
  AppState,
  usableForwardRef,
} from './ingress'

export default ingress
export { IngressApp, Route, Ingress, Context, AppState }
export { ListenOptions, Addon, Usable, SetupTeardown, usableForwardRef }
export { StatusCode } from '@ingress/http-status'

export { BaseContext, DefaultContext, BaseAuthContext, Request, Response, Type } from './context'

export { Authenticate } from './annotations/authenticate'
export { fromConnect } from './annotations/from-connect'
export { AfterRequest } from './annotations/after-request'

export { compose } from 'app-builder'

//SOMEDAY: alias this
export { createAnnotationFactory } from 'reflect-annotations'

export * from './websocket/namespace'
export * from './websocket/upgrade'
export * from './websocket/backchannel'

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
} from './router/router'
