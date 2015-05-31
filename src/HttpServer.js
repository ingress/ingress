import { Server } from 'http'
import { WebServer } from './AbstractWebServer.js'

export class HttpServer extends WebServer {
  constructor () {
    super()
    this.server = new Server;
    this.isListening = false
  }

  onRequest (fn) {
    this.server.on('request', fn)
  }

  listen (...args) {
    if (this.isListening) {
      return Promise.reject(new Error('.listen can only be called once'))
    }
    this.isListening = true
    return new Promise(res => this.server.listen(...args, res))
  }

  close () {
    return new Promise(res => this.server.close(res))
  }
}