import { ING_BAD_REQUEST } from '@ingress/types'
import type { RouterContext } from './router.js'
import type { Type } from '@ingress/core'
import { kIngressRouterTestPass } from './router.js'

export type Resolver<TPicked = unknown, TParsed = unknown> = {
  pick?: Func<RouterContext, TPicked>
  parse?: Func<TPicked, TParsed>
  test?: Func<TPicked, symbol>
}

export type Func<TArg = unknown, TReturn = unknown> = ((a: TArg) => TReturn) | ((a: TArg) => Promise<TReturn>)

const dateOnly = /^\d{4}-\d{2}-\d{2}$/
const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?$/

const TestUtils = {
  isBoolean(value: any): boolean {
    return (
      value === true ||
      value === 'true' ||
      value === 1 ||
      value === '1' ||
      value === false ||
      value === 'false' ||
      value === 0 ||
      value === '0' ||
      value === '' ||
      value === undefined ||
      value === null
    )
  },

  isNumber(value: any): boolean {
    const num = Number(value)
    return !isNaN(num) && value !== '' && value !== null && value !== undefined
  },

  isString(value: any): boolean {
    if (value === null || value === undefined) return false
    const isNumber = this.isNumber(value)
    const isBoolean = this.isBoolean(value)
    let isDate = false
    if (typeof value === 'string' && value.length > 0) {
      isDate = this.isDate(value)
    }
    return !isNumber && !isBoolean && !isDate
  },

  isDate(value: any): boolean {
    if (typeof value !== 'string') return false

    // First check if it's a valid date string
    const timestamp = Date.parse(value)
    if (Number.isNaN(timestamp)) return false

    // Then validate the format
    const trimmed = value.trim()
    if (dateOnly.test(trimmed)) return true
    if (dateTime.test(trimmed)) return true

    return false
  },
}

export class TypeResolver {
  public types = new Map<Type<any>, Resolver<any, any>>()

  constructor() {
    for (const resolver of defaultResolvers) {
      this.register(resolver.type, resolver as any)
    }
  }

  public predicates: Array<[Func<any, boolean>, Resolver<any, any>]> = []

  register<TPicked = any, TParsed = any>(type: Type<any>, resolver: Resolver<TPicked, TParsed>): this {
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
  typeof Request !== 'undefined' && {
    type: Request,
    pick: (context: RouterContext) => context.request.asRequest(),
    test: (value: any) => (value instanceof Request ? kIngressRouterTestPass : Symbol('not-request')),
  },
  {
    type: URLSearchParams,
    pick: (context: RouterContext) => context.request.searchParams,
    test: (value: any) =>
      value instanceof URLSearchParams ? kIngressRouterTestPass : Symbol('not-url-search-params'),
  },
  {
    type: Object,
    parse: (value: any) => value,
    test: (value: any) =>
      typeof value === 'object' && value !== null ? kIngressRouterTestPass : Symbol('not-object'),
  },
  {
    type: Number,
    parse: (value: number): number => {
      if (value === null || isNaN(value)) {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to number`)
      }
      return Number(value)
    },
    test: (value: any): symbol => {
      return TestUtils.isNumber(value) ? kIngressRouterTestPass : Symbol('not-number')
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
    test: (value: any): symbol => {
      return TestUtils.isBoolean(value) ? kIngressRouterTestPass : Symbol('not-boolean')
    },
  },
  {
    type: String,
    parse: (value: string): string => {
      if (value === null || value === undefined) {
        throw new ING_BAD_REQUEST(`cannot convert ${value === null ? 'null' : 'undefined'} to string`)
      }
      return value + ''
    },
    test: (value: any): symbol => {
      return TestUtils.isString(value) ? kIngressRouterTestPass : Symbol('not-string')
    },
  },
  {
    type: Date,
    parse: (value: string): Date => {
      if (!TestUtils.isDate(value)) {
        throw new ING_BAD_REQUEST(`cannot convert ${JSON.stringify(value)} to Date`)
      }
      return new Date(Date.parse(value))
    },
    test: (value: any): symbol => {
      return TestUtils.isDate(value) ? kIngressRouterTestPass : Symbol('not-date')
    },
  },
].filter(isTruthy)

function isTruthy<T>(x: T | undefined | false | null | 0): x is T {
  return Boolean(x)
}
