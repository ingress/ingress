import { parse, SubtextOptions } from '@hapi/subtext'
import { BaseContext } from '../context'
import { createAnnotationFactory, Annotation } from 'reflect-annotations'

export interface ParseBodyOptions {
  maxBytes?: number
  buffer?: boolean
  stream?: boolean
  parse?: boolean
}

export class ParseBodyAnnotation {
  public readonly isBodyParser = true
  private options: SubtextOptions
  constructor(options?: ParseBodyOptions) {
    options = options || {}
    this.options = {
      parse: options.parse || false,
      output: options.buffer ? 'data' : options.stream ? 'stream' : 'data',
      maxBytes: options.maxBytes || 1e7,
    }
  }

  get middleware() {
    const options = this.options
    return async (context: BaseContext<any, any>, next: any) => {
      const result = await parse(context.req, null, options)
      context.route.parserResult = result
      context.route.body = result.payload
      return next()
    }
  }
}

/**
 * Apply Custom (stream or buffer) Parsing as middleware
 */
const ParseBody = createAnnotationFactory(ParseBodyAnnotation) as (
  options?: ParseBodyOptions
) => Annotation<ParseBodyAnnotation>
export { ParseBody }
