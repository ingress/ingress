// import { Ingress } from '../ingress'
// import { Server } from 'ws'
// import { Router } from '../router/router'

// export class WebSocketAddon {
//   server = new Server({ noServer: true })
//   constructor(private options: WebsocketServerConfig = {}) {}

//   const onUpgrade =

//   start(app: Ingress) {
//     app.server?.on('upgrade', (req, socket, head) => {
//       const router = (app as any).router as Router<any>
//       router.handleUpgrade(req, socket, head)
//     })
//   }

//   async stop(app: Ingress) {
//     this.server.unmount()
//     if (!app.websockets) {
//       return
//     }
//     this.handler = undefined
//   }
// }
