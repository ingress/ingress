declare module 'subtext' {
  import { IncomingMessage } from 'http'
  import { Buffer } from 'buffer'

  export function parse (
    request: IncomingMessage,
    tap: any,
    options: {
      parse: boolean,
      output: 'data' | 'stream' | 'file',
      maxBytes?: number,
      override?: string,
      defaultContentType?: string,
      allow?: string,
      timeout?: number
      qs?: Object,
      uploads?: string,
      decoders?: { [key: string]: Function },
      compression?: { [key: string]: Function }
    },
    callback: (err: Error | void, result: { payload: any }) => void): void
}
