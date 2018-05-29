import { Url } from 'url'
import { IncomingMessage, ServerResponse } from 'http'
import { Handler } from './handler'
import { Type } from './type'
import { CoreContext, BaseContext, Response, Request } from '@ingress/core'

export interface RoutedRequest<T> extends Request<T> {
  body: any
  query: { [key: string]: any }
  params: { [key: string]: any }
}

export interface CurrentRoute<T extends RouterContext<T>> {
  controllerInstance: any
  parserResult: any
  handler: Handler<T>
}

export interface RouterContext<T extends RouterContext<T>> extends CoreContext<T> {
  url: Url
  route: CurrentRoute<T>
  req: RoutedRequest<T>
  body: any
}

export abstract class BaseRouterContext<T extends RouterContext<T>> extends BaseContext<T>
  implements RouterContext<T> {
  url: Url
  route: CurrentRoute<T>
  req: RoutedRequest<T>
  body: any
  handleError: (error: Error | null) => Promise<any> | any
  handleResponse: () => any
}
