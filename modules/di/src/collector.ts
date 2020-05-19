export const Type = Function
export interface Type<T> {
  new (...args: any[]): T
}

export interface DependencyCollector {
  (): ClassDecorator
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
      this.items.add(target)
    }
  }
}
