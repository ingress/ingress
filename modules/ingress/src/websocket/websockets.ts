import {
  server as WebsocketServer,
  IServerConfig,
  request as WebsocketRequest,
  connection as WebsocketConnection,
} from 'websocket'
export { WebsocketServer, WebsocketRequest, IServerConfig }
import { Subject } from 'rxjs'

export interface Exclusions {
  [channelId: string]: boolean
}

type Acknowledgement = string
type Message = any
type Namespace = string
type Channels = string[]
export type BackChannelMessage = [Message, Channels, Namespace, Exclusions | null, Acknowledgement | null]

export class Connection<T> {
  constructor(private socket: WebsocketConnection, public authContext: T) {}
}

export class ConnectionGroup {
  constructor(public name: string, private backchannel: Subject<BackChannelMessage>) {}
}

export class Websockets {
  constructor(private server: WebsocketServer) {}
}
