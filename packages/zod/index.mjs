import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const zodModule = require('./lib/cjs/index.js')

// Re-export everything from the CommonJS module
export const { boundary } = zodModule

// Re-export all other exports from zod/v4
export * from 'zod/v4'
