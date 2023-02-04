export const Type = Function
export interface Type<T> {
  new (...args: any[]): T
}
export type Func<T = any> = (...args: any[]) => T
import { ING_BAD_REQUEST } from '@ingress/types'

export class TypeResolver {
  public types = new Map<Type<any>, Func>(defaultResolvers.map((x) => [x.type, x.convert]))
  public predicates: Array<[Func<boolean>, Func]> = []

  register(type: Type<any>, resolver: Func): this {
    this.types.set(type, resolver)
    return this
  }

  registerPredicate(predicate: Func<boolean>, resolver: Func): this {
    this.predicates.push([predicate, resolver])
    return this
  }

  get(type: Type<any>): Func | undefined {
    const resolver = this.types.get(type)
    if (resolver) {
      return resolver
    }
    for (const test of this.predicates) {
      if (test[0](type)) return test[1]
    }
  }
}

const defaultResolvers = [
  {
    type: Object,
    convert: (value: any) => value,
  },
  {
    type: Number,
    convert: (value: number): number => {
      if (value === null || isNaN(value)) {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to number`)
      }
      return Number(value)
    },
  },
  {
    type: Boolean,
    convert(value: boolean | string | null | undefined | number): boolean {
      if (value === true || value === 'true' || value === 1 || value === '1') {
        return true
      }
      if (
        value === false ||
        value === 'false' ||
        value === 0 ||
        value === '0' ||
        value === '' ||
        value === undefined ||
        value === null
      ) {
        return false
      }
      throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to boolean`)
    },
  },
  {
    type: String,
    convert: (value: string): string => {
      if (value === null || value === undefined) {
        throw new ING_BAD_REQUEST(
          `cannot convert ${value === null ? 'null' : 'undefined'} to string`
        )
      }
      return value + ''
    },
  },
  {
    type: Date,
    convert: (value: string | Date): Date => {
      const date = new Date(value)

      if (date.toString() === 'Invalid Date') {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to Date`)
      }

      return date
    },
  },
]
