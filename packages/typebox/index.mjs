import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { Type, Static, Value, StaticDecode, FormatRegistry } = require('./lib/cjs/index.js')

export { Type, Static, Value, StaticDecode, FormatRegistry }
