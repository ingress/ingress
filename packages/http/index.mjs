import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const module = require('./lib/cjs/node.http.js')

//console.log(Object.keys(module))

const Http = module.Http

export { Http }
