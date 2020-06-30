import { ServerResponse, IncomingMessage } from 'http'
import { Writable } from 'stream'

export class WebsocketServerResponse extends ServerResponse {
  constructor(req: IncomingMessage) {
    super(req)
    this.assignSocket(
      new Writable({
        write(_, __, callback) {
          setImmediate(callback)
        },
      }) as any
    )
  }
}
