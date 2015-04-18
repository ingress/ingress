import http from 'http'
import AppBuilder from 'app-builder'
import Environment from './environment'

export default class Server extends AppBuilder {

  listen (...args) {
    if (this.httpServer)
      return Promise.reject(new Error('.listen can only be called once'))
    let appFn = this.build()
    this.httpServer = http.createServer((req, res) => {
      appFn.call(this, Environment.create(req, res))
    })
    return new Promise(res => this.httpServer.listen(...args, res))
  }
}

export { Environment }