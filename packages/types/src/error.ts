export function createErrorType<T, Props extends CustomErrorProps>(
  name: string,
  baseProperties: Props,
  base: ErrorConstructor<T> = Error as any
): ErrorConstructor<T & Props & { name: string }> {
  type ErrorInstance = T & Props & { name: string }
  const props = Object.entries(baseProperties),
    l = props.length,
    { [name]: ErrorType } = {
      [name]: function (this: ErrorInstance, ...args: any[]) {
        if (!(this instanceof ErrorType)) {
          return new (ErrorType as any)(...args)
        }
        cst(this, ErrorType)
        this.name = name
        for (let i = 0; i < l; i++) {
          ;(this as any)[props[i][0]] = props[i][1]
        }
        if (args[0]) {
          this.message = args[0]
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
  }) as unknown as ErrorConstructor<ErrorInstance>
}

export interface ErrorOptions {
  cause?: Error
}
export interface ErrorConstructor<T> {
  new (message?: string, options?: ErrorOptions): T
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

/* istanbul ignore next: not node env */
const noop = () => void 0,
  cst = (Error as any).captureStackTrace?.bind(Error) ?? noop
