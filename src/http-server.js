import { Server } from 'http'

export class HttpServer extends Server {
  listen (...args) {
    return new Promise(res => super.listen(...args, res))
  }

  close () {
    return new Promise(res => super.close(res))
  }
}