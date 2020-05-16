//API
import ingress, { IngressApp, Context, AuthContextFactory } from './app'
import { Route } from './router/router'
import { Ingress, ListenOptions, Addon, Usable, SetupTeardown } from './ingress'

export default ingress
export { IngressApp, Route, Ingress, Context, AuthContextFactory }
export { ListenOptions, Addon, Usable, SetupTeardown }

//Supporting Symbols
export { BaseContext, DefaultContext, BaseAuthContext, Request, Response } from './context'

export {
  PathFactory,
  Context as ContextParam,
  ContextParamAnnotation,
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
