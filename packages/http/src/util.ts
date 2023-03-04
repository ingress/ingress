import type { Stream } from 'node:stream'

export function isThenable<T = void>(obj: any): obj is PromiseLike<T> {
  return isObjectLike(obj) && typeof obj.then === 'function'
}

export function isObjectLike(obj: any): obj is Record<string, unknown> {
  const type = typeof obj
  return obj && (type === 'function' || type === 'object')
}

export function exists<T>(x: T | null | undefined): x is T {
  return x !== null && x !== void 0
}

export function hasLength(x: any): x is { length: number } {
  return isText(x) || isBytes(x)
}

export function isNumber(x: any): x is number {
  return typeof x === 'number' && !Number.isNaN(x)
}

export function isSerializableError(
  x: any
): x is { contentType?: string; statusCode: number; statusMessage?: string } {
  return isError(x) && 'statusCode' in x
}

const toString = {}.toString,
  errorTag = '[object Error]'
export function isError(x: any): x is Error {
  return toString.call(x) === errorTag
}

export function isText(data: any): data is string {
  return typeof data === 'string'
}

export function isStream(obj: any): obj is Stream {
  return isObjectLike(obj) && typeof obj.pipe === 'function'
}

export function isJson(data: any) {
  if (exists(data)) return data
}

export function isBytes(data: any) {
  return Buffer.isBuffer(data) || data instanceof Uint8Array
}

export function getContentType(data: any) {
  if (isBytes(data)) return 'application/octet-stream' as const
  if (isText(data)) return 'text/plain;charset=UTF-8' as const
  if (isStream(data)) return 'application/octet-stream' as const
  if (isJson(data)) return 'application/json' as const
  return null
}

export type Pathname = string
export type SearchString = `?${string}` | ''

const enum SearchSeparator {
  Hash = 35,
  SemiColon = 59,
  QuestionMark = 63,
}
/**
 * Given the "path" which potentially includes additional fragments, split the two
 * eg. : /path/to/route?with=query&parameters=1 => ['/path/to/route', '?with=query&parameters=1']
 *
 * @param path
 * @returns
 */
export function readUrl(path?: string): [Pathname, SearchString] {
  if (!path) return ['/', '']
  const pathName = path
  let i = 0
  for (; i < path.length; i++) {
    const c = path.charCodeAt(i)
    if (
      SearchSeparator.Hash === c ||
      SearchSeparator.QuestionMark === c ||
      SearchSeparator.SemiColon === c
    ) {
      path = path.slice(0, i)
      break
    }
  }
  const query = pathName.slice(i + 1)
  return [path, query && `?${query}`]
}
