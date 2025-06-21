import { isClass } from '@ingress/core'
import { Route } from './route.annotation.js'
import type { Type } from '@ingress/core'

export interface ControllerOptions {
  routePrefix?: string
}
export interface Controller {
  (options?: ControllerOptions | string | Type<any>): ClassDecorator
}

export type ControllerDependencyCollector = ClassDecorator & Controller

export class ControllerCollector {
  public clear(): void {
    this.items.clear()
  }
  public items = new Set<Type<any>>()
  public collect: ControllerDependencyCollector
  private _collector: ClassDecorator
  constructor() {
    this._collector = (target: any) => {
      this.items.add(target)
    }
    this.collect = ((options?: ControllerOptions | Type<any>) => {
      if (!options) {
        return this._collector
      }
      const prefix: string = (typeof options === 'string' && options) || Object(options).routePrefix
      if (prefix) {
        return ((target: any) => {
          Route(prefix)(target)
          this._collector(target)
        }) as ClassDecorator
      }
      if (isClass(options)) {
        return this._collector(options)
      }
      throw new TypeError('Unrecognized options type')
    }) as ControllerDependencyCollector
  }
}
