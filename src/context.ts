import { IncomingMessage, ServerResponse } from 'http'

export type RequestContext = { req: IncomingMessage, res: ServerResponse }

export default function <T extends Context> ({req, res }: RequestContext): Context {
  return new Context(req, res)
}

export interface DefaultContext {
  req: IncomingMessage
  res: ServerResponse
  error: Error
  body: any

  handleError?: ((error: Error) => any) | void
  handleResponse?: () => void
}

export class Context implements DefaultContext {
  public req: IncomingMessage
  public res: ServerResponse
  public error: Error
  public body: any
  constructor (req: IncomingMessage, res: ServerResponse) {
    this.req = req
    this.res = res
  }

  handleError () {}
  handleResponse () {}
}
