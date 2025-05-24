import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { Router, TreeNode } = require('./lib/cjs/tree.js')

export { Router, TreeNode }
