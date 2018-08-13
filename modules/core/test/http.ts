import { request, IncomingMessage } from 'http'

const defaultPort = 8888

export function makeRequest(
  path: string,
  method: string = 'GET',
  port?: number,
  body?: string
): Promise<IncomingMessage> {
  port = port || defaultPort
  return new Promise((res, rej) => {
    request({ port, path, method }, res)
      .on('error', rej)
      .end(body)
  })
}

export function getResponse(res: IncomingMessage) {
  return new Promise(function(resolve) {
    let data = ''
    res.on('data', (chunk: Buffer) => (data += chunk))
    res.on('end', () => resolve(data))
  })
}
