export const Type = Function
export interface Type<T> {
  new(...args: any[]): T
}
