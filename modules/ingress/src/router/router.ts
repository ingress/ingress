import { Middleware, DefaultContext } from '../context'

export const Controller = Function
export interface Controller<T> {
  new (...args: any[]): T
}

export class Router<T = DefaultContext> {
  public controllers: Controller<any>[]
  constructor({ controllers }: { controllers: Controller<any>[] }) {
    this.controllers = controllers
  }

  get middleware(): Middleware<T> {
    return (context, next) => {
      void context
      return next()
    }
  }
}
