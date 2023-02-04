import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { TreeNode, Router } = require('./lib/cjs/tree.js')

export { TreeNode, Router }
