import { PromiseConfig as AppBuilderPromiseConfig } from 'app-builder'

export interface PromiseConstructorLike {
  new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>
  all<T>(...values: T[]): PromiseLike<T[]>
  resolve<T>(value?: T): PromiseLike<T>
  reject<T>(reason?: any): PromiseLike<T>
}

export interface PromiseConfig {
  _constructor: PromiseConstructorLike
  constructor: PromiseConstructorLike
}

export const PromiseConfig: PromiseConfig = {
  _constructor: Promise,

  get constructor () {
    return this._constructor
  },
  set constructor (ctor) {
    AppBuilderPromiseConfig.constructor = ctor
    this._constructor = ctor
  }
}
