import { Server } from 'http'

export class HttpServer extends Server {
  constructor () {
    super()
    this.isListening = false
  }

  onRequest (fn) {
    this.on('request', fn)
  }

  listen (...args) {
    if (this.isListening) {
      return Promise.reject(new Error('.listen can only be called once'))
    }
    this.isListening = true
    return new Promise(res => super.listen(...args, res))
  }

  close () {
    return new Promise(res => super.close(res))
  }
}