import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const module = require('./lib/cjs/core.js')

const Ingress = module.Ingress,
  AppState = module.AppState,
  ingress = module.ingress,
  compose = module.compose,
  Logger = module.Logger,
  exec = module.exec,
  executeByArity = module.executeByArity,
  guards = module.guards,
  isClass = module.isClass,
  isMiddlewareFunction = module.isMiddlewareFunction,
  is = module.is,
  forwardRef = module.forwardRef,
  forTest = module.forTest,
  InjectionToken = module.InjectionToken,
  Injectable = module.Injectable,
  ModuleContainer = module.ModuleContainer,
  ContextToken = module.ContextToken,
  DependencyCollectorList = module.DependencyCollectorList,
  createContainer = module.createContainer,
  def = module.default

export {
  Ingress,
  AppState,
  ingress,
  compose,
  exec,
  executeByArity,
  guards,
  isClass,
  isMiddlewareFunction,
  is,
  InjectionToken,
  Logger,
  Injectable,
  ModuleContainer,
  ContextToken,
  DependencyCollectorList,
  createContainer,
  forwardRef,
  forTest,
}

export default def
