import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { ingress, Route, Ingress, Router, Http } = require('./lib/cjs/ingress.js')
export { ingress, Route, Ingress, Router, Http }
export default ingress
