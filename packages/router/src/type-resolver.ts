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

  getResolver(type: Type<any>): Func | undefined {
    if (this.types.has(type)) {
      return this.types.get(type)
    }
    for (const test of this.predicates) {
      if (test[0](type)) return test[1]
    }
  }
}

const defaultResolvers = [
  {
    type: Number,
    convert: (value: number): number => {
      if (value === null || isNaN(value)) {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to number`)
      }
      return +value
    },
  },
  {
    type: Boolean,
    convert(value: boolean | string | null | undefined): boolean {
      if (value === 'true' || value === true) {
        return true
      }
      if (value === 'false' || value === false || value === undefined || value === '') {
        return false
      }
      throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to boolean`)
    },
  },
  {
    type: String,
    convert: (value: string): string => {
      if (value === null || value === undefined) {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to string`)
      }
      return value.toString()
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
