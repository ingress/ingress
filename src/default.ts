import { DefaultContext } from './context'

export class DefaultMiddleware {
  constructor (public onError: (error: Error) => any = null) {}

  get middleware () {
    const onError = this.onError
    return (context: DefaultContext, next: () => Promise<any>) => {
      context.res.statusCode = 404
      return next().then(null, onError)
        .then(() => context.handleResponse())
    }
  }
}
