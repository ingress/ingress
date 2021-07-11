import type { BaseContext, Middleware } from '../context.js'
import { createAnnotationFactory, Annotation } from 'reflect-annotations'
import { StatusCode } from '@ingress/http-status'

interface Authenticator<T extends BaseContext<any, any>> {
  (context: T): Promise<boolean> | boolean
  scheme?: string
  realm?: string
}

interface AuthenticateOptions {
  scheme: string
  realm?: string
}

class AuthenticateAnnotation<T extends BaseContext<any, any>> {
  private authenticator: Authenticator<T> | null = null
  private scheme = 'Basic'
  private realm = ''
  constructor(public options?: Authenticator<T> | AuthenticateOptions) {
    if ('function' === typeof options) {
      this.authenticator = options
    }
    Object.assign(this, options || {})
  }

  get middleware(): Middleware<T> {
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
    return async (context: T, next: () => Promise<any>) => {
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
  (options?: Authenticator<any> | AuthenticateOptions): Annotation<AuthenticateAnnotation<any>>
}

export const Authenticate: AuthenticateAnnotationFactory =
  createAnnotationFactory(AuthenticateAnnotation)
