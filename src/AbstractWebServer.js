function getUsageError (method) {
  return new Error(`Method "${method}" must be implemented`)
}

export class WebServer {
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