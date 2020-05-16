import { parse, SubtextOptions } from '@hapi/subtext'
import { BaseContext } from '../context'
import { createAnnotationFactory, Annotation } from 'reflect-annotations'

/**
 * @public
 */
export interface ParseOptions {
  maxBytes?: number
  buffer?: boolean
  stream?: boolean
  parse?: boolean
}

/**
 * @public
 */
export class ParseAnnotation {
  public readonly isBodyParser = true
  private options: SubtextOptions
  constructor(options?: ParseOptions) {
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
 * @public
 */
const Parse = createAnnotationFactory(ParseAnnotation) as (options?: ParseOptions) => Annotation<ParseAnnotation>
export { Parse }
