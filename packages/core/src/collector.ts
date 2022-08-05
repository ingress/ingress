import type { FactoryProvider, ValueProvider, ClassProvider } from 'injection-js'

export type DependencyProvider =
  | Omit<FactoryProvider, 'provide'>
  | Omit<ValueProvider, 'provide'>
  | Omit<ClassProvider, 'provide'>

export const Type = Function
export interface Type<T> {
  new (...args: any[]): T
}

export type Func<T = unknown, Args extends unknown[] = unknown[]> = (...args: Args) => T
export interface DependencyCollector {
  (opts?: DependencyProvider): ClassDecorator
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
      if ('useClass' in target || 'useFactory' in target || 'useValue' in target) {
        return (provide: any) => {
          const provider = { provide, ...target }
          this.items.add(provider)
        }
      }
      this.items.add(target)
    }
  }
}
