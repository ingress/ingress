import { Url } from 'url'
import { IncomingMessage, ServerResponse } from 'http'
import { Type } from './type'

export interface RoutedRequest<T> extends IncomingMessage {
  context: T
  body: any,
  query: { [key: string]: any } | null,
  params: { [key: string]: any }
}

export interface Response<T> extends ServerResponse {
  context: T
}

export interface RouterContext<T> {
  url: Url
  router: { controller: any, bodyResult: any }
  req: RoutedRequest<T>
  res: Response<T>
  error: Error | null | undefined
  body: any
  handleError?: ((error?: Error) => any) | any
  handleResponse?: () => any
}

export abstract class BaseRouterContext<T> implements RouterContext<T> {
  public url: Url
  public router: { controller: any, bodyResult: any }
  public req: RoutedRequest<T>
  public res: Response<T>
  public error: Error | null | undefined
  public body: any
  public handleError?: ((error?: Error) => any) | any
  public handleResponse?: () => any
}
