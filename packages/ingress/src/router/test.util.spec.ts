import { get, request, IncomingMessage } from 'http'
import { parse } from 'url'
import getPortAsync from 'get-port'

export async function getPort(): Promise<{
  port: number
  path: (uri: string, protocol?: string) => string
}> {
  const port = await getPortAsync()
  return {
    port,
    path(uri: string, protocol = 'http') {
      return `${protocol}://localhost:${port}${uri}`
    },
  }
}

export function getAsync(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    get(url, (x) => parseResponse(x).then(resolve, reject))
  })
}

async function parseResponse(response: IncomingMessage): Promise<string> {
  const body = new Promise<string>((resolve, reject) => {
    let res = ''
    const consume = (chunk: Buffer) => (res += chunk)
    function destroy(error?: Error) {
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
  if ((response.statusCode || 500) >= 300) {
    return Promise.reject({
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      body: await body,
    })
  }
  return body
}

export function postAsync(path: string, { data, headers, method }: any = {}): Promise<string> {
  const url = parse(path),
    postData = data === void 0 ? '' : JSON.stringify(data),
    options = {
      host: url.hostname,
      port: parseInt(url.port as string, 10),
      path: url.path,
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(headers || {}),
      },
    }
  return new Promise((resolve, reject) => {
    const req = request(options, (x) => parseResponse(x).then(resolve, reject))
    req.end(postData)
  })
}
