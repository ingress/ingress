import { BaseContext, Middleware } from '../context'
import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import { StatusCode } from '@ingress/http-status'

interface Authenticator {
  (context: BaseContext<any, any>): Promise<boolean> | boolean
  scheme?: string
  realm?: string
}

interface AuthenticateOptions {
  scheme: string
  realm?: string
}

class AuthenticateAnnotation {
  private authenticator: Authenticator | null = null
  private scheme = 'Basic'
  private realm = ''
  constructor(public options?: Authenticator | AuthenticateOptions) {
    if ('function' === typeof options) {
      this.authenticator = options
    }
    Object.assign(this, options || {})
  }

  get middleware(): Middleware<BaseContext<any, any>> {
    const { scheme, realm } = this
    if (!this.authenticator) {
      return (context, next) => {
        if (context.authContext.authenticated === true) {
          return next()
        }
        context.res.setHeader('WWW-Authenticate', scheme + (realm ? ` realm=${realm}` : ''))
        context.res.statusCode = StatusCode.Unauthorized
      }
    }
    return async (context: BaseContext<any, any>, next: () => Promise<any>) => {
      if (this.authenticator && (await Promise.resolve(this.authenticator(context)))) {
        return next()
      }
      if (!context.res.hasHeader('WWW-Authenticate')) {
        context.res.setHeader('WWW-Authenticate', scheme + (realm ? ` realm=${realm}` : ''))
        context.res.statusCode = StatusCode.Unauthorized
      }
    }
  }
}

interface AuthenticateAnnotationFactory {
  (options?: Authenticator | AuthenticateOptions): Annotation<AuthenticateAnnotation>
}

export const Authenticate: AuthenticateAnnotationFactory = createAnnotationFactory(AuthenticateAnnotation)
