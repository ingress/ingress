import { IncomingMessage, ServerResponse } from 'http'

export default function createContext ({ req, res }: { req: IncomingMessage, res: ServerResponse }): Context {
  return new Context(req, res)
}

export interface DefaultContext<T> {
  req: IncomingMessage & { context: T }
  res: ServerResponse & { context: T }
  error: Error | null | undefined
  body: any
  handleError?: ((error?: Error) => any) | any
  handleResponse?: () => any
}

export abstract class BaseContext<T extends DefaultContext<T>> implements DefaultContext<T> {
  public req: IncomingMessage & { context: T }
  public res: ServerResponse & { context: T }
  public error: Error | null | undefined
  public body: any
  constructor (request: IncomingMessage, response: ServerResponse) {
    (<any>request).context = this;
    (<any>response).context = this
    this.req = <IncomingMessage & { context: T }>request
    this.res = <ServerResponse & { context: T }>response
  }

  handleError () {}
  handleResponse () {}
}

export class Context extends BaseContext<Context>{}
