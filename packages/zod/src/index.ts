import { safeParse, toJSONSchema } from 'zod/v4'
import type { $ZodType, infer as zodInfer } from 'zod/v4/core'
import { ING_BAD_REQUEST } from '@ingress/types'
import type { Annotation } from 'reflect-annotations'
import {
  kIngressRouterParse,
  kIngressRouterPick,
  kIngressRouterParserKind,
  kIngressRouterSchema,
} from '@ingress/router'
import type { Func } from '@ingress/core'

export type ZodBoundaryType<T extends $ZodType> = T & { new (...args: never[]): never }
export type { zodInfer }

export * from 'zod/v4'
export function boundary<T extends $ZodType>(
  schema: T,
  parse?: (raw: unknown, schema: T) => zodInfer<T> | Promise<zodInfer<T>>,
  pick?: Annotation,
): ZodBoundaryType<T> {
  const annotated = schema as T & {
    [kIngressRouterParserKind]: 'zod:v1'
    [kIngressRouterSchema]?: Func<object>
    [kIngressRouterPick]?: Func
    [kIngressRouterParse]: Func
  }

  annotated[kIngressRouterSchema] = (...args: any[]) => {
    return toJSONSchema(schema, ...args)
  }

  if (pick) {
    annotated[kIngressRouterPick] = pick.annotationInstance?.[kIngressRouterPick]?.bind(
      pick.annotationInstance,
    )
  }
  annotated[kIngressRouterParse] = parse
    ? (ctx: any) => {
        return parse(ctx, schema)
      }
    : (pick?.annotationInstance?.[kIngressRouterParse]?.bind(pick.annotationInstance) ??
      function (raw: any) {
        const result = safeParse(schema, raw)
        if (result.success) {
          return result.data
        }
        const error = result.error.issues[0]
        const path = error.path.length > 0 ? ` at /${error.path.join('/')}` : ''
        throw new ING_BAD_REQUEST(error && `${error.message}${path}`)
      })
  return schema as unknown as ZodBoundaryType<T>
}
