import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  Ingress,
  Router,
  Http,
  Route,
  NextFn,
  forwardRef,
  forTest,
  ContextToken,
  Context,
  ingress,
  Routes,
  Controller,
  Service,
  Singleton,
  UseSingleton,
  fromGlobalContext,
  default: ingressDefault,
} = require('./lib/cjs/ingress.js')

export {
  Ingress,
  Router,
  Http,
  Route,
  NextFn,
  forwardRef,
  forTest,
  ContextToken,
  Context,
  ingress,
  Routes,
  Controller,
  Service,
  Singleton,
  UseSingleton,
  fromGlobalContext,
}

export default ingressDefault
