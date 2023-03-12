import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { ingress, Route, Ingress, Router, Http, forwardRef } = require('./lib/cjs/ingress.js')
export { ingress, forwardRef, Route, Ingress, Router, Http }
export default ingress
