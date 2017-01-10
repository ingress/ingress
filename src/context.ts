import { IncomingMessage, ServerResponse } from 'http'

export default function createContext ({ req, res }: { req: IncomingMessage, res: ServerResponse }): Context {
  return new Context(req, res)
}

export interface Request<T> extends IncomingMessage {
  context?: T
}

export interface Response<T> extends ServerResponse {
  context?: T
}

export interface DefaultContext<T extends DefaultContext<T>> {
  req: Request<T>
  res: Response<T>
  error: Error | null | undefined
  body: any
  handleError?: ((error?: Error) => any) | any
  handleResponse?: () => any
}

export abstract class BaseContext<T extends DefaultContext<T>> implements DefaultContext<T> {
  public req: Request<T>
  public res: Response<T>
  public error: Error | null | undefined
  public body: any
  constructor (req: IncomingMessage, res: ServerResponse) {
    this.req = req
    this.res = res
    this.res.context = this.req.context = <T>(<any>this)
  }

  handleError () {
    throw new Error('Not Implemented')
  }

  handleResponse () {
    throw new Error('Not Implemented')
  }
}

export class Context extends BaseContext<Context>{}
