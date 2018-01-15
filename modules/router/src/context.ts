import { Url } from 'url'
import { IncomingMessage, ServerResponse } from 'http'
import { Handler } from './handler'
import { Type } from './type'

export interface RoutedRequest<T> extends IncomingMessage {
  context: T
  body: any
  query: { [key: string]: any }
  params: { [key: string]: any }
}

export interface Response<T> extends ServerResponse {
  context: T
}

export interface CurrentRoute<T extends RouterContext<T>> {
  controllerInstance: any
  parserResult: any
  handler: Handler<T>
}

export interface RouterContext<T extends RouterContext<T>> {
  url: Url
  route: CurrentRoute<T>
  req: RoutedRequest<T>
  res: Response<T>
  error: Error | null | undefined
  body: any
  handleError: (error: Error | null) => Promise<any> | any
  handleResponse: () => any
}

export abstract class BaseRouterContext<T extends RouterContext<T>> implements RouterContext<T> {
  public url: Url
  public route: CurrentRoute<T>
  public req: RoutedRequest<T>
  public res: Response<T>
  public error: Error | null | undefined
  public body: any
  public handleError: (error: Error | null) => Promise<any> | any
  public handleResponse: () => any
}
