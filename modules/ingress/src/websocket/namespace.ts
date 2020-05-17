import {
  server as WebsocketServer,
  IServerConfig,
  request as WebsocketRequest,
  connection as WebsocketConnection,
  IMessage,
} from 'websocket'
export { WebsocketServer, WebsocketRequest, IServerConfig }
import { Subject, fromEvent, Observable } from 'rxjs'
import { Ack } from './ack'
import { map } from 'rxjs/operators'
import { createBackChannel } from './backchannel'

const DefaultExclusions: Exclusions = Object.create(null)
export interface Exclusions {
  [channelId: string]: boolean
}
export type AnyJsonPrimitive = string | number | boolean | null
export type AnyJsonObject = { [key: string]: AnyJson }
export type AnyJsonArray = AnyJson[]
export type AnyJson = AnyJsonPrimitive | AnyJsonObject | AnyJsonArray

type Acknowledgement = string
type ChannelGroupName = string
export type ToChannels = string[]
export type Message = AnyJson
export type BackChannelMessage = [ChannelGroupName, ToChannels, Message, Exclusions | null, Acknowledgement | null]
export type LocalMessage = [ToChannels, Message, Exclusions | null, Acknowledgement | null]
export class SocketMessage {
  constructor(public message: Message, public connection: Connection) {}
}

export class Connection {
  channels = new Map<string, Channel>()
  private closing = false
  onPong = fromEvent(this.conn as any, 'pong').pipe(map(() => this._onPong()))
  onMessage = fromEvent(this.conn as any, 'message').pipe(map((x: any) => this._onMessage(x)))
  onClose = fromEvent(this.conn as any, 'close').pipe(map(() => this._onClose()))
  onError = fromEvent<Error>(this.conn as any, 'error').pipe(map((e) => this._onError(e)))

  constructor(public id: string, private conn: WebsocketConnection | null, private namespace: Namespace) {}

  send(message: Buffer | string, cb?: (...args: any[]) => void) {
    this.conn?.send(message, cb)
  }

  join(name: string) {
    if (this.closing) {
      return this
    }
    this.channels.set(name, this.namespace.addToChannel(name, this))
    return this
  }

  leave(name: string) {
    this.channels.delete(name)
    this.namespace.removeFromChannel(name, this)
    return this
  }

  end() {
    this.closing = true
    this.conn?.close()
  }

  private _dispose() {
    if (!this.conn) {
      return
    }
    for (const x of this.channels.keys()) {
      this.leave(x)
    }
    this.conn = null
  }

  private _onPong() {
    return this
  }

  private _onError(e: Error) {
    return e
  }

  private _onMessage(message: IMessage) {
    return new SocketMessage(JSON.parse(message.utf8Data ?? 'null'), this)
  }

  private _onClose() {
    this.closing = true
    Promise.resolve().then(() => this._dispose())
    return this
  }
}

export class Channel extends Map<string, Connection> {
  constructor(public name: string, public namespace: Namespace) {
    super()
  }
  send(message: any, exclusions: Exclusions = {}) {
    return this.namespace.send({ message, channels: [this.name], exclusions })
  }
}

export type NamespaceOptions = {
  backchannel: Subject<BackChannelMessage>
  timeout: number
}

export class Namespace {
  public channels = new Map<string, Channel>()
  private backchannel = new Subject<BackChannelMessage>()
  private backchannelTimeout = 1000
  public onMessage = new Observable<SocketMessage>()
  public onPong = new Observable<Connection>()
  public onError = new Observable<Connection>()
  public onClose = new Observable<Connection>()
  private empty = new Channel('__empty__', this)
  private pendingAcks = new Map<string, Ack>()
  constructor(
    public name: string,
    options: NamespaceOptions = {
      backchannel: createBackChannel(),
      timeout: 1000,
    }
  ) {
    this.backchannel = options.backchannel
    this.backchannelTimeout = options.timeout
  }

  createConnection<T>(id: string, conn: WebsocketConnection, extensions: T): Connection & T {
    return Object.assign(new Connection(id, conn, this), extensions)
  }

  addToChannel(name: string, ...connections: Connection[]) {
    let channel = this.channels.get(name)
    if (!channel) {
      channel = new Channel(name, this)
    }
    for (const conn of connections) {
      channel.set(conn.id, conn)
    }
    return channel
  }

  removeFromChannel(name: string, ...connections: Connection[]) {
    const channel = this.channels.get(name)
    if (!channel) {
      return
    }
    for (const conn of connections) {
      channel.delete(conn.id)
    }
    if (!channel.size) {
      this.channels.delete(name)
    }
  }

  private sendLocal({
    message,
    channels,
    exclusions,
    ack,
  }: {
    message: Message
    channels: ToChannels
    exclusions: Exclusions | null
    ack: Acknowledgement | null
  }) {
    const toExclude = exclusions ?? DefaultExclusions,
      sentTo = new Set<string>()
    let payload = '',
      i = channels.length,
      canAck = false

    while (i--) {
      const channel = this.channels.get(channels[i]) || this.empty
      for (const connection of channel.values()) {
        if (!sentTo.has(connection.id) && !(connection.id in toExclude)) {
          connection.send(payload || (payload = JSON.stringify(message)))
          canAck = true
          sentTo.add(connection.id)
        }
      }
    }
    if (ack && canAck) {
      const bcmAck: BackChannelMessage = ['__ack__', [], [ack], null, null]
      this.backchannel.next(bcmAck)
    }
  }

  send({
    message,
    channels = [],
    exclusions,
    ack,
  }: {
    message: Message
    channels?: ToChannels
    exclusions?: Exclusions
    ack?: Acknowledgement
  }): Promise<any> {
    const bcm: BackChannelMessage = [this.name, channels, message, exclusions ?? null, ack ?? null]
    if (ack) {
      const pending = new Ack(this.pendingAcks, ack, this.backchannelTimeout)
      this.backchannel.next(bcm)
      return pending.promise
    }
    this.backchannel.next(bcm)
    return Promise.resolve()
  }
}
