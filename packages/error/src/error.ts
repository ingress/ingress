export default createErrorType
export function createErrorType<T, Props extends CustomErrorProps>(
  name: string,
  baseProperties: Props,
  base: ErrorConstructor<T> = Error as any
): ErrorConstructor<T & Props & { name: string }> {
  type ErrorInstance = T & Props & { name: string }
  const props = Object.entries(baseProperties),
    l = props.length,
    { [name]: ErrorType } = {
      [name]: function (this: ErrorInstance, message?: string) {
        if (!(this instanceof ErrorType)) {
          return new (ErrorType as any)(message)
        }
        cst(this, ErrorType)
        this.name = name
        for (let i = 0; i < l; i++) {
          ;(this as any)[props[i][0]] = props[i][1]
        }
        if (message) {
          this.message = message
        }
      },
    }

  return Object.defineProperties(ErrorType, {
    prototype: {
      value: Object.create(base.prototype, {
        toString: value(customErrorToString),
        [Symbol.toStringTag]: value('Error'),
        constructor: value(ErrorType),
      }),
    },
  }) as ErrorConstructor<ErrorInstance>
}

export interface ErrorConstructor<T> {
  new (...args: any[]): T
}

type CustomErrorProps = { message: string; code: string; statusCode?: number }

function customErrorToString(this: CustomErrorProps & { name: string }) {
  return `${this.name} [${this.code}]: ${this.message}`
}

function value<T>(value: T) {
  return {
    value,
    writable: true,
    configurable: true,
  }
}

const cst =
  Error.captureStackTrace.bind(Error) || /* istanbul ignore next: not node env */ (() => void 0)
