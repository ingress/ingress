import type { IncomingMessage } from 'http'
import { Buffer } from 'buffer'
import { ING_PAYLOAD_TOO_LARGE, ING_BAD_REQUEST } from '@ingress/types'

const identity = <T>(x: string) => x as any as T

export function parseString<T = string>(
  req: IncomingMessage,
  sizeLimit: number,
  deserializer?: (body: string) => T | Promise<T>
): Promise<T> {
  deserializer = deserializer || identity
  return new Promise((resolve, reject) => {
    req.setEncoding('utf8')
    let body = '',
      size = 0
    const concatData = (chunk: string) => {
        //Avoid O(n) checking actual byteLength while ingesting data
        //at worst, slightly more memory consumption above sizeLimit
        if ((size += chunk.length) > sizeLimit) {
          return finish(new ING_PAYLOAD_TOO_LARGE())
        }
        body += chunk
      },
      finish = (error?: Error) => {
        req.removeListener('data', concatData)
        req.removeListener('end', finish)
        req.removeListener('error', finish)
        if (error) return reject(error)
        if (Buffer.byteLength(body, 'utf8') > sizeLimit) {
          return reject(new ING_PAYLOAD_TOO_LARGE())
        }
        try {
          resolve((deserializer || identity)(body as any))
        } catch (e: any) {
          if (!e.statusCode) reject(new ING_BAD_REQUEST(e.message))
          else reject(e)
        }
      }
    req.addListener('error', finish)
    req.addListener('end', finish)
    req.addListener('data', concatData)
  })
}

export function parseBuffer(req: IncomingMessage, sizeLimit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = []
    let size = 0
    const collectData = (chunk: Buffer) => {
        if ((size += chunk.byteLength) > sizeLimit) {
          return finish(new ING_PAYLOAD_TOO_LARGE())
        }
        buffers.push(chunk)
      },
      finish = (error?: Error) => {
        req.removeListener('data', collectData)
        req.removeListener('end', finish)
        req.removeListener('error', finish)
        if (error) return reject(error)
        resolve(Buffer.concat(buffers))
      }
    req.addListener('error', finish)
    req.addListener('end', finish)
    req.addListener('data', collectData)
  })
}
