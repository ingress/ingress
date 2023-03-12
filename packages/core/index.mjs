import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const module = require('./lib/cjs/core.js')

//console.log(Object.keys(module))

const Ingress = module.Ingress,
  AppState = module.AppState,
  ingress = module.ingress,
  compose = module.compose,
  exec = module.exec,
  forwardRef = module.forwardRef,
  InjectionToken = module.InjectionToken,
  Injectable = module.Injectable,
  ModuleContainer = module.ModuleContainer,
  ContextToken = module.ContextToken,
  createContainer = module.createContainer,
  def = module.default

export {
  Ingress,
  AppState,
  ingress,
  compose,
  exec,
  InjectionToken,
  Injectable,
  ModuleContainer,
  ContextToken,
  createContainer,
  forwardRef,
}

export default def
