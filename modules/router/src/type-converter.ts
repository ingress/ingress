export const Type = Function
export interface Type<T> {
  new (...args: any[]): T
}
export type Func<T = any> = (...args: any[]) => T
/**
 * @public
 */
export interface ExactTypeConverter<T> {
  type: Type<T>
  convert(value: any): T
}

/**
 * @public
 */
export interface PredicateTypeConverter<T> {
  typePredicate: (type: (...args: any[]) => any) => boolean
  convert(value: any): T
}

/**
 * @public
 */
export type TypeConverter<T> = ExactTypeConverter<T> | PredicateTypeConverter<T>

export const defaultTypeConverters: TypeConverter<any>[] = [
  {
    type: Number,
    convert: (value: number): number => {
      if (value === null || isNaN(value)) {
        throw new Error(`cannot convert ${JSON.stringify(value)} to number`)
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
      if (value === 'false' || value === false) {
        return false
      }
      throw new Error(`cannot convert ${JSON.stringify(value)} to boolean`)
    },
  },
  {
    type: String,
    convert: (value: string): string => {
      if (value === null || value === undefined) {
        throw new Error(`cannot convert ${JSON.stringify(value)} to string`)
      }
      return value.toString()
    },
  },
  {
    type: Date,
    convert: (value: string | Date): Date => {
      const date = new Date(value)

      if (date.toString() === 'Invalid Date') {
        throw new Error('Invalid Date Input')
      }

      return date
    },
  },
]
