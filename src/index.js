import http from 'http'
import { AppBuilder } from 'app-builder'
import { Environment } from './environment'

export class Server extends AppBuilder {

  listen (...args) {
    if (this.httpServer)
      return Promise.reject(new Error('.listen can only be called once'))
    let appFn = this.build()
    this.httpServer = http.createServer((request, response) => {
      appFn.call(this, new Environment({request,response}))
    })
    return new Promise(res => this.httpServer.listen(...args, res))
  }
}

export default function (...args) {
  return new Server(...args);
}

export { Environment }