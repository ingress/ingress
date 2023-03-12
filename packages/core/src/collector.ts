import type { FactoryProvider, ValueProvider, ClassProvider } from 'injection-js'

export type DependencyProvider =
  | Omit<FactoryProvider, 'provide'>
  | Omit<ValueProvider, 'provide'>
  | Omit<ClassProvider, 'provide'>

export type MaybeForwardRef = Type<any> | (() => Type<any>)

export type PriorityOptions = {
  priority: { before: MaybeForwardRef; after?: never } | { before?: never; after: MaybeForwardRef }
}

export interface Type<T> extends Function {
  new (...args: any[]): T
}

export type Func<T = unknown, Args extends unknown[] = unknown[]> = (...args: Args) => T
export interface DependencyCollector {
  (opts?: PriorityOptions): ClassDecorator
  (opts?: DependencyProvider): ClassDecorator
  (target: any): void
}

export class DependencyCollectorList {
  static priorities = new WeakMap<any, PriorityOptions>()
  public items = new Set<Type<any>>()
  public collect: DependencyCollector
  constructor() {
    this.collect = (target?: any): any => {
      if (!target) {
        return this.collect
      }
      if ('priority' in target) {
        return (provider: any) => {
          DependencyCollectorList.priorities.set(provider, target)
          this.items.add(provider)
        }
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
