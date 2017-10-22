export const Type = Function
export interface Type<T> {
  new(...args: any[]): T
}

export interface DependencyCollectorFactory {
  (): ClassDecorator
}

export type DependencyCollectorDecorator = DependencyCollectorFactory & ClassDecorator

export class DependencyCollector {
  public collected: Array<Type<any>> = []
  public collect: DependencyCollectorDecorator
  private _collector: ClassDecorator
  constructor () {
    this._collector = (target: any) => {
      this.collected.push(target)
    }
    this.collect = (target?: any) => {
      if (!target) {
        return this._collector
      }
      return this._collector(target) as ClassDecorator
    }
  }
}
