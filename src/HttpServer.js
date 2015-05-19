import http from 'http';

function getUsageError (method) {
  return new Error(`Method "${method}" must be implemented`)
}

class WebServer {
  onRequest () {
    throw getUsageError('onRequest')
  }
  listen () {
    throw getUsageError('listen')
  }
  close () {
    throw getUsageError('close')
  }
}

class HttpServer extends WebServer {

  constructor() {
    super()
    this.server = http.createServer()
    this.isListening = false
  }

  onRequest(fn) {
    this.server.on('request', fn)
  }

  listen(...args) {
    if (this.isListening) {
      return Promise.reject(new Error('.listen can only be called once'))
    }
    this.isListening = true
    return new Promise(res => this.server.listen(...args, res))
  }

  close() {
    return new Promise(res => this.server.close(res))
  }
}

export {
  HttpServer,
  WebServer
}