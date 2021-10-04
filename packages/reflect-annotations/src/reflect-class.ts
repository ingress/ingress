import type { Type } from './annotations.js'

export function reflectClassProperties<T>(source: Type<T>): {
  source: Type<T>
  properties: string[]
  constructors: Type<T>[]
} {
  const properties = new Set<string>(),
    addProp = (x: string) => properties.add(x),
    constructors: Type<T>[] = []

  let current = source

  while (current !== Function.prototype) {
    Object.getOwnPropertyNames(current.prototype).forEach(addProp)
    constructors.push(current)
    current = Object.getPrototypeOf(current)
  }
  properties.delete('constructor')
  return {
    source,
    properties: Array.from(properties),
    constructors,
  }
}
