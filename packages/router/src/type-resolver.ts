import { ING_BAD_REQUEST } from '@ingress/types'
import type { RouterContext } from './router.js'
export const routeArgumentParserRegistry = new WeakMap<any, Resolver<any, any>>()

export const Type = Function
export interface Type<T> {
  new (...args: any[]): T
}

export type Resolver<TPicked = unknown, TParsed = unknown> =
  | {
      pick: Func<RouterContext, TPicked>
      parse: Func<TPicked, TParsed>
    }
  | {
      pick: Func<RouterContext, TPicked>
    }
  | {
      parse: Func<any, TParsed>
    }

export type Func<TArg = unknown, TReturn = unknown> =
  | ((a: TArg) => TReturn)
  | ((a: TArg) => Promise<TReturn>)

export class TypeResolver {
  public types = new Map<Type<any>, Resolver<any, any>>()

  constructor() {
    for (const resolver of defaultResolvers) {
      this.register(resolver.type, { parse: resolver.parse } as any)
    }
  }

  public predicates: Array<[Func<any, boolean>, Resolver<any, any>]> = []

  register<TPicked = any, TParsed = any>(
    type: Type<any>,
    resolver: Resolver<TPicked, TParsed>,
  ): this {
    this.types.set(type, resolver)
    return this
  }

  registerPredicate<TPicked = any, TParsed = any>(
    predicate: Func<any, boolean>,
    resolver: Resolver<TPicked, TParsed>,
  ): this {
    this.predicates.push([predicate, resolver])
    return this
  }

  get(type: Type<any>): Resolver<any, any> | undefined {
    const globallyRegistered = routeArgumentParserRegistry.get(type)
    if (globallyRegistered) {
      return globallyRegistered
    }
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
    parse: (value: any) => value,
  },
  {
    type: Number,
    parse: (value: number): number => {
      if (value === null || isNaN(value)) {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to number`)
      }
      return Number(value)
    },
  },
  {
    type: Boolean,
    parse(value: boolean | string | null | undefined | number): boolean {
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
    parse: (value: string): string => {
      if (value === null || value === undefined) {
        throw new ING_BAD_REQUEST(
          `cannot convert ${value === null ? 'null' : 'undefined'} to string`,
        )
      }
      return value + ''
    },
  },
  {
    type: Date,
    parse: (value: string): Date => {
      const date = new Date(Date.parse(value))

      if (date.toString() === 'Invalid Date') {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to Date`)
      }

      return date
    },
  },
]
