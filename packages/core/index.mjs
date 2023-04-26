import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const module = require('./lib/cjs/core.js')

const Ingress = module.Ingress,
  AppState = module.AppState,
  ingress = module.ingress,
  compose = module.compose,
  Logger = module.Logger,
  exec = module.exec,
  forwardRef = module.forwardRef,
  forTest = module.forTest,
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
  Logger,
  Injectable,
  ModuleContainer,
  ContextToken,
  createContainer,
  forwardRef,
  forTest,
}

export default def
