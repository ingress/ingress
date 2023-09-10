import type { TSchema } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import { routeArgumentParserRegistry } from '@ingress/router'
import { ING_BAD_REQUEST } from '@ingress/types'
import { JavaScriptTypeBuilder, Static } from '@sinclair/typebox'

/**
 * This type is not constructable
 */
type NonConstructableDesignTypeEmitter<T> = T & { new (...args: never[]): never }

class DesignTypeBuilder extends JavaScriptTypeBuilder {
  public DesignType<T extends TSchema>(
    schema: T,
    from?: any,
  ): NonConstructableDesignTypeEmitter<T> {
    const compiled = TypeCompiler.Compile(schema),
      pick =
        from &&
        (typeof from === 'function' || typeof from === 'object') &&
        'annotationInstance' in from &&
        from.annotationInstance?.pick
          ? from.annotationInstance.pick.bind(from.annotationInstance)
          : undefined
    routeArgumentParserRegistry.set(schema, {
      ...(pick ? { pick } : {}),
      parse: (value: any) => {
        if (compiled.Check(value)) {
          return value
        }
        throw new ING_BAD_REQUEST('Failed to parse request', {
          cause: new Error(JSON.stringify(compiled.Errors(value).First())),
        })
      },
    })
    return schema as NonConstructableDesignTypeEmitter<T>
  }
}

export const Type = new DesignTypeBuilder()
export { Static }
