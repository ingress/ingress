import {
  server as WebsocketServer,
  IServerConfig,
  request as WebsocketRequest,
  connection as WebsocketConnection,
  IMessage,
} from 'websocket'
export { WebsocketServer, WebsocketRequest, IServerConfig }
import { Subject, fromEvent } from 'rxjs'
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
  onError = fromEvent(this.conn as any, 'error')
  pingSubscription = this.onPong.subscribe(this.namespace.onPong)
  messageSubscription = this.onMessage.subscribe(this.namespace.onMessage)
  closeSubscription = this.onClose.subscribe(this.namespace.onClose)

  constructor(public id: string, private conn: WebsocketConnection, private namespace: Namespace) {}

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
    //remove channel reference from connection
    this.channels.delete(name)
    //remove connection from channel, and maybe release channel if empty
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
    this.closeSubscription.unsubscribe()
    this.messageSubscription.unsubscribe()
    this.pingSubscription.unsubscribe()
    delete this.conn
  }

  private _onPong() {
    return this
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

export class Namespace {
  public channels = new Map<string, Channel>()
  public onMessage = new Subject<SocketMessage>()
  public onPong = new Subject<Connection>()
  public onError = new Subject<Connection>()
  public onClose = new Subject<Connection>()
  private empty = new Channel('__empty__', this)
  private pendingAcks = new Map<string, Ack>()
  constructor(public name: string, private backchannel: Subject<BackChannelMessage> = createBackChannel()) {}

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
      canSoftAck = false

    while (i--) {
      const channel = this.channels.get(channels[i]) || this.empty
      for (const connection of channel.values()) {
        if (!sentTo.has(connection.id) && !(connection.id in toExclude)) {
          connection.send(payload || (payload = JSON.stringify(message)))
          canSoftAck = true
          sentTo.add(connection.id)
        }
      }
    }
    if (ack && canSoftAck) {
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
  }) {
    const bcm: BackChannelMessage = [this.name, channels, message, exclusions ?? null, ack ?? null]
    this.backchannel.next(bcm)
  }
}
