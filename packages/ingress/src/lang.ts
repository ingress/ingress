export function pick<T, K extends keyof T>(from?: T, ...keys: K[]): Pick<T, K> | undefined {
  if (!from) return undefined
  if (typeof from !== 'object' || !from) return undefined
  const picked: any = {}
  let found = false
  for (const key of keys) {
    if (Object.hasOwn(from, key)) {
      found = true
      picked[key] = from[key]
    }
  }
  return found ? picked : undefined
}
