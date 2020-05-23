// import { Ingress } from '../ingress'
// import { Server } from 'ws'

// export class WebSocketAddon {
//   server = new Server({ noServer: true })
//   constructor(private options: WebsocketServerConfig = {}) {}

//   start(app: Ingress) {
//     app.server?.on('upgrade')
//     app.router?.match()
//   }

//   async stop(app: Ingress) {
//     this.server.unmount()
//     if (!app.websockets) {
//       return
//     }
//     this.handler = undefined
//   }
// }
