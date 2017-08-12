import { get, request } from 'http'
import { parse } from 'url'

export function getAsync (url: string) {
  return new Promise<string>((resolve, reject) => {
    get(url, x => parseResponse(x).then(resolve, reject))
  })
}

function parseResponse (response: any): Promise<string> {
  return new Promise((resolve, reject) => {
    var res = '',
      consume = (chunk: Buffer) => res += chunk
    function destroy (error?: Error) {
      error && reject(error)
      response.removeListener('data', consume)
      response.removeListener('error', destroy)
      response.removeListener('end', destroy)
      resolve(res)
    }
    response.on('data', consume)
    response.once('error', destroy)
    response.once('end', destroy)
  })
}

export function postAsync (path: string, data: any, headers: any = {}) {
  const url = parse(path),
    postData = data ? JSON.stringify(data) : '',
    options = {
      host: url.hostname,
      port: parseInt(url.port as string, 10),
      path: url.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }

  return new Promise((resolve, reject) => {
    const req = request(options, x => parseResponse(x).then(resolve, reject))
    req.write(postData)
    req.end()
  })
}
