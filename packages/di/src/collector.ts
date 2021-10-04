import type { FactoryProvider } from 'injection-js'

export type FactoryOptions = Omit<FactoryProvider, 'provide'>

export const Type = Function
export interface Type<T> {
  new (...args: any[]): T
}

export type Func<T = any> = (...args: any[]) => T
export interface DependencyCollector {
  (opts?: FactoryOptions): ClassDecorator
  (target: any): void
}

export class DependencyCollectorList {
  public items = new Set<Type<any>>()
  public collect: DependencyCollector
  constructor() {
    this.collect = (target?: any): any => {
      if (!target) {
        return this.collect
      }
      if ('useFactory' in target) {
        return (provide: any) => {
          const provider = { provide, ...target }
          this.items.add(provider)
        }
      }
      this.items.add(target)
    }
  }
}
