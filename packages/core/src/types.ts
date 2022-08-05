import type { Ingress, Middleware } from './core.js'
import type { Annotation } from 'reflect-annotations'
import type { ModuleContainerContext, Func } from './di.js'

/**
 * Lifecycle stages of an app
 */
export enum AppState {
  /**
   * Indicates the app has not been run before
   */
  New = 0,
  /**
   * The app is stopping
   */
  Stopping = 1,
  /**
   * The App is stopped after having been started
   */
  Stopped = 2,
  /**
   * The App is initializing
   */
  Starting = 3,
  /**
   * The app is ready
   */
  Started = 4,
  /**
   * The app is ready
   */
  Ready = 4,
  /**
   * The app is running
   */
  Running = 5,
}

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

export interface Startable {
  /**
   * Middleware that executes on start of the application, in the order it was registered
   */
  start: Middleware<Ingress<any>>
}
export interface ContextInitializer {
  /**
   * Context initialization method invoked synchronously before the application's middleware
   */
  extendContext: Func
}
export interface Stopable {
  /**
   * Middleware that executes at the stop of the application, in the order it was registered
   */
  stop: Middleware<Ingress<any>>
}
export interface UsableMiddleware<T> {
  /**
   * Middleware that executes in the middleware of the application
   */
  middleware: Middleware<T>
}

export type UsableType<T> = Startable & ContextInitializer & Stopable & UsableMiddleware<T>
export type Usable<T = any> = RequireAtLeastOne<UsableType<T>>
/**
 * @public
 */
export type Addon<T extends ModuleContainerContext> =
  | Usable<T>
  | Annotation<Usable<T>>
  //  | AnnotationFactory<UsableType>
  | Middleware<T>
  | Ingress<T>
  | (Usable<T> & Middleware<T>)

export const guards = {
  isStartable,
  isContextInitializer,
  isStopable,
  isMiddleware,
  checkUsableMiddleware,
  canStart,
}

function isStartable(usable: any): usable is Startable {
  return checkPropertyIsFunctionOrGetter(usable, 'start')
}
function isContextInitializer(usable: any): usable is ContextInitializer {
  return checkPropertyIsFunctionOrGetter(usable, 'extendContext')
}
function isStopable(usable: any): usable is Stopable {
  return checkPropertyIsFunctionOrGetter(usable, 'stop')
}
function isMiddleware<T>(usable: any): usable is UsableMiddleware<T> {
  const descriptor = getDescriptor(usable, 'middleware')
  if (typeof descriptor?.value === 'function') {
    if (descriptor.value.length !== 2) return false
    return true
  }
  return typeof descriptor?.get === 'function'
}

function checkUsableMiddleware<T>(usable: any): usable is UsableMiddleware<T> {
  if (!isMiddleware(usable)) {
    throw new TypeError('Middleware must accept two arguments, context and next')
  }
  return true
}

function canStart(state: AppState) {
  return ![AppState.Starting, AppState.Started, AppState.Running].includes(state)
}

function getDescriptor(obj: any, prop: string) {
  if (!Reflect.has(obj, prop)) {
    return undefined
  }
  let focus = obj,
    descriptor = Reflect.getOwnPropertyDescriptor(focus, prop)
  while (!descriptor) {
    focus = Reflect.getPrototypeOf(focus)
    descriptor = Reflect.getOwnPropertyDescriptor(focus, prop)
  }
  return descriptor
}

/**
 * If the property is a simple function this is overly complex, but
 * if it is getter we want to execute it as lazily as possible
 * @param obj
 * @param prop
 * @returns
 */
function checkPropertyIsFunctionOrGetter(obj: any, prop: string) {
  const descriptor = getDescriptor(obj, prop)
  return typeof descriptor?.get === 'function' || typeof descriptor?.value === 'function'
}
