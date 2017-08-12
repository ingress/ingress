import { parse } from 'subtext'
import { createAnnotationFactory } from 'reflect-annotations'
import { Annotation } from './annotations'

export interface ParseBodyOptions {
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
}

export class ParseBodyAnnotation {
  public isBodyParser = true
  constructor (public options:ParseBodyOptions = { parse: true, output: 'data', maxBytes: 1e7 }) {}

  get middleware() {
    const options = this.options
    return (context: any, next: () => Promise<any>) => {
      return new Promise((resolve, reject) => {
        parse(context.req, null, options, (err, result) => {
          if (err) {
            return reject(err)
          }
          context.route.parserResult = result
          context.req.body = result.payload
          resolve(next())
        })
      })
    }
  }
}

export const ParseBody: (options?: ParseBodyOptions) => Annotation = createAnnotationFactory(ParseBodyAnnotation)

export const parseJsonBody = new ParseBodyAnnotation().middleware
