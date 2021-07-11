import type { Type } from './annotations.js'

function uniqueNotConstructor(names: Array<string>, name: string) {
  ~names.indexOf(name) || (name !== 'constructor' && names.push(name))
  return names
}

export function reflectClassProperties<T>(source: Type<T>): {
  source: Type<T>
  properties: string[]
  constructors: Type<T>[]
} {
  const properties: string[] = [],
    constructors: Type<T>[] = []

  let current = source

  while (current && current.prototype && current !== Function.prototype) {
    Object.getOwnPropertyNames(current.prototype).reduce(uniqueNotConstructor, properties)
    constructors.push(current)
    current = Object.getPrototypeOf(current)
  }

  return {
    source,
    properties,
    constructors,
  }
}
