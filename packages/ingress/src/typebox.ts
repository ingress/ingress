import { type StaticDecode, type TSchema, FormatRegistry, TypeGuard } from '@sinclair/typebox'
import type { TypeCheck } from '@sinclair/typebox/compiler'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import { Value } from '@sinclair/typebox/value'
import { ING_BAD_REQUEST } from '@ingress/types'
import { JavaScriptTypeBuilder, Static } from '@sinclair/typebox'
import type { Annotation } from 'reflect-annotations'
import { kIngressRouterParse, kIngressRouterPick } from '@ingress/router'
import type { Func } from '@ingress/core'

type JsonSchemaBoundaryType<T> = T & { new (...args: never[]): never }
const kIngressJSONSchema = Symbol.for('ingress:json-schema')

class BoundaryTypeBuilder extends JavaScriptTypeBuilder {
  public Boundary<T extends TSchema>(
    schema: T,
    parse?: (
      raw: unknown,
      check: TypeCheck<T>,
      schema: T,
    ) => StaticDecode<T> | Promise<StaticDecode<T>>,
    pick?: Annotation,
  ): JsonSchemaBoundaryType<T> {
    const compiled = TypeCompiler.Compile(schema),
      annotated = schema as T & {
        [kIngressRouterPick]?: Func
        [kIngressRouterParse]: Func
        [kIngressJSONSchema]: true
      }
    if (pick) {
      annotated[kIngressRouterPick] = pick.annotationInstance?.[kIngressRouterPick]?.bind(
        pick.annotationInstance,
      )
    }
    annotated[kIngressJSONSchema] = true

    annotated[kIngressRouterParse] = parse
      ? (ctx: any) => {
          return parse(ctx, compiled, schema)
        }
      : pick?.annotationInstance?.[kIngressRouterParse]?.bind(pick.annotationInstance) ??
        function (raw: any) {
          const passed = compiled.Check(raw)
          if (passed) {
            return compiled.Decode(raw)
          }
          const error = compiled.Errors(raw).First()
          throw new ING_BAD_REQUEST(
            error && `${error.message}${error.path ? ` at ${error.path}` : ''}`,
          )
        }

    return schema as JsonSchemaBoundaryType<T>
  }
}

export const Type = new BoundaryTypeBuilder()

export { Static, Value, StaticDecode, FormatRegistry }
