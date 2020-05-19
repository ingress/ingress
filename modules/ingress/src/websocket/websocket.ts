// import { Ingress } from '../ingress'
// import { BaseContext } from '../context'
// import { IncomingMessage, Server as HttpServer } from 'http'
// import { IServerConfig, WebsocketServer, WebsocketRequest } from './namespace'

// type WebsocketServerConfig = Omit<IServerConfig, 'httpServer'> & {
//   contextFactory?: (req: IncomingMessage) => Promise<BaseContext<any, any>> | BaseContext<any, any>
// }

// export class WebsocketAddon {
//   server = new WebsocketServer()
//   private handler?: (req: WebsocketRequest) => void

//   constructor(private options: WebsocketServerConfig = {}) {}

//   start(app: Ingress) {
//     void app
//   }

//   async stop(app: Ingress) {

//     this.server.unmount()
//     if (!app.websockets) {
//       return
//     }
//     this.handler = undefined
//   }
// }
