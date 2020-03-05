export interface Type<T> {
  new (...args: any[]): T
}

export interface ExactTypeConverter<T> {
  type: Type<T>
  convert(value: any, paramType: Function): T
}

export interface PredicateTypeConverter<T> {
  typePredicate: (type: Function) => boolean
  convert(value: any, paramType: Function): T
}

export type TypeConverter<T> = ExactTypeConverter<T> | PredicateTypeConverter<T>

export const defaultTypeConverters: TypeConverter<any>[] = [
  {
    type: Number,
    convert: value => {
      if (value === null || isNaN(value)) {
        throw new Error(`cannot convert ${JSON.stringify(value)} to number`)
      }
      return +value
    }
  },
  {
    type: String,
    convert: value => {
      if (value === null || value === undefined) {
        throw new Error(`cannot convert ${JSON.stringify(value)} to string`)
      }
      return value.toString()
    }
  },
  {
    type: Boolean,
    convert(value) {
      return Boolean(value && value.toString().toLowerCase() === 'true')
    }
  },
  {
    type: Object,
    convert(value) {
      return value
    }
  }
]
