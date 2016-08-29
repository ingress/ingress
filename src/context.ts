import { IncomingMessage, ServerResponse } from 'http'

export type RequestContext = { req: IncomingMessage, res: ServerResponse }

export default function <T extends DefaultContext> ({req, res }: RequestContext): DefaultContext {
  return new DefaultContext(req, res)
}

export interface Context {
  req: IncomingMessage
  res: ServerResponse
  error: Error
  body: any
}

export class DefaultContext implements Context {
  public req: IncomingMessage
  public res: ServerResponse
  public error: Error
  public body: any
  constructor (req: IncomingMessage, res: ServerResponse) {
    this.req = req
    this.res = res
  }
}
