function uniqueNotConstructor (names: Array<string>, name: string) {
  ~names.indexOf(name) || name !== 'constructor' && names.push(name)
  return names
}

export function reflectClassProperties (source: Function) {
  const properties: string[] = [],
    constructors: Function[] = []

  let current = source

  while (current && current.prototype && current !== Function.prototype) {
    Object.getOwnPropertyNames(current.prototype)
      .reduce(uniqueNotConstructor, properties)
    constructors.push(current)
    current = Object.getPrototypeOf(current)
  }

  return {
    source,
    properties,
    constructors
  }
}
