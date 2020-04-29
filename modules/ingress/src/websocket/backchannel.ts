import { Subject } from 'rxjs'
import { v4 as uuid } from 'uuid'

type PubSub = {
  channel: string
  notify(message: string | Buffer): void
  listen(listener: (message: Buffer) => void): void
}
type TransportMessage<T> = { nodeId: string; value: T }
type Serializer<A = any> = {
  encode(message: any): Buffer | string
  decode(buffer: Buffer | string): TransportMessage<A>
}
export type Transport = (PubSub & Serializer) | PubSub

/**
 * "Shared" Subjects/Channels
 */
class LocalChannel<T> extends Subject<T> {
  static instances: { [key: string]: LocalChannel<any> } = {}
  private channel: string
  constructor(opts: { channel?: string } = {}) {
    super()
    this.channel = opts.channel || uuid()
    const existing = LocalChannel.instances[this.channel]
    if (existing) {
      return existing
    }
    LocalChannel.instances[this.channel] = this
  }
}

export function createBackChannel<T = any>(
  options: { nodeId?: string; transport?: Transport; channel?: string } = {}
): Subject<T> {
  if (options.transport) {
    return new BackChannel<T>({ transport: options.transport, nodeId: options.nodeId })
  }
  return new LocalChannel<T>(options)
}

export class BackChannel<T> extends Subject<T> {
  static instances: { [index: string]: BackChannel<any> } = {}
  private transport!: PubSub & Serializer<T>
  private nodeId: string
  private channel: string

  constructor({ nodeId, transport }: { nodeId?: string; transport: Transport }) {
    super()
    this.nodeId = nodeId || uuid()
    this.channel = transport.channel

    const existing = BackChannel.instances[this.channel]
    if (existing) {
      return existing
    }

    this.transport = Object.assign(transport, {
      encode: 'encode' in transport ? transport.encode.bind(transport) : JSON.stringify,
      decode:
        'decode' in transport ? transport.decode.bind(transport) : (e: Buffer | string) => JSON.parse(e.toString()),
    })
    BackChannel.instances[this.channel] = this
    this.transport.listen((message) => {
      const packet = this.transport.decode(message)
      if (packet.nodeId !== this.nodeId) {
        super.next(packet.value)
      }
    })
  }

  next(value: T) {
    this.transport.notify(this.transport.encode({ value, nodeId: this.nodeId }))
    super.next(value)
  }
}
