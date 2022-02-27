import type { Stream } from 'stream'

export function isThenable<T = void>(obj: any): obj is PromiseLike<T> {
  return isObjectLike(obj) && typeof obj.then === 'function'
}

export function isObjectLike(obj: any): boolean {
  const type = typeof obj
  return obj && (type === 'function' || type === 'object')
}

export function exists(x: any) {
  return x !== null && x !== void 0
}

export function isHtmlLike(data: any): data is string {
  return typeof data === 'string' && data.startsWith('<') && data.endsWith('>')
}

export function isText(data: any): data is string {
  return typeof data === 'string'
}

export function isJson(data: any) {
  if (exists(data)) return data
}

export function isBytes(data: any) {
  return Buffer.isBuffer(data) || data instanceof Uint8Array
}

export function getContentType(data: any) {
  if (isBytes(data)) return 'application/octet-stream'
  if (isHtmlLike(data)) return 'text/html'
  if (isText(data)) return 'text/plain; charset=utf-8'
  if (isJson(data)) return 'application/json'
  return 'application/octet-stream'
}

export function isStream(obj: any): obj is Stream {
  return obj && typeof obj.pipe === 'function'
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
