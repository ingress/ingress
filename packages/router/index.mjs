import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  Route,
  RouteData,
  Router,
  readUrl,
  ControllerCollector,
  kIngressRouterParse,
  kIngressRouterPick,
} = require('./lib/cjs/router.js')

export {
  Route,
  RouteData,
  Router,
  readUrl,
  kIngressRouterParse,
  kIngressRouterPick,
  ControllerCollector,
}
