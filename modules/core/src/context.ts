import { IncomingMessage, ServerResponse } from 'http'
import { Buffer } from 'buffer'
import { Stream } from 'stream'

export default function createContext({ req, res }: { req: IncomingMessage; res: ServerResponse }) {
  return new DefaultContext(req, res)
}

export interface Request<T> extends IncomingMessage {
  context: T
}

export type Body = any

export interface Response<T> extends ServerResponse {
  context: T
}

export interface CoreContext<T extends CoreContext<T>> {
  req: Request<T>
  res: Response<T>
  error: Error | null | undefined
  body: Body
  handleError(error: Error | null): Promise<any> | any
  handleResponse(): any
}

export abstract class BaseContext<T extends CoreContext<T>> implements CoreContext<T> {
  abstract handleError: (error: Error | null) => any
  abstract handleResponse: () => any
  public req: Request<T>
  public res: Response<T>
  public error: Error | null | undefined
  public body: Body
  constructor(req: IncomingMessage, res: ServerResponse) {
    this.req = req as Request<T>
    this.res = res as Response<T>
    this.error = this.body = null
    this.res.context = this.req.context = <T>(<any>this)
  }
}

export class DefaultContext extends BaseContext<DefaultContext> {
  handleError = (_: Error | null) => {
    throw new Error('Not Ipmlemented')
  }
  handleResponse = () => {
    throw new Error('Not Implemented')
  }
}
