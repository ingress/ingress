import type { NextFn } from './compose.js'
import type { CoreContext } from './di.js'
import type { Ingress } from './core.js'

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
  Stopping = 1 << 0,
  /**
   * The App is stopped after having been started
   */
  Stopped = 1 << 1,
  /**
   * The App is initializing
   */
  Starting = 1 << 2,
  /**
   * The app is ready
   */
  Started = 1 << 3,
  /**
   * The app is ready
   */
  Ready = 1 << 4,
  /**
   * The app is running
   */
  Running = 1 << 5,
}

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

const NoDecorations = {}
export type EmptyExtend = typeof NoDecorations
export type AnyFunc<A, R> = (...args: A[]) => R

export type StartAndExtend<NewContext, NewDecorations> = ContextInitializer<NewContext> &
  Startable<NewDecorations>

export interface Startable<NewDecorations = EmptyExtend> {
  /**
   * Middleware that executes on start of the application, in the order it was registered
   */
  start: (
    app: Ingress<any>,
    next: NextFn
  ) => ReturnType<NextFn> | Promise<NewDecorations> | NewDecorations
}
export interface ContextInitializer<NewContext> {
  /**
   * Context initialization method invoked synchronously before the application's middleware
   */
  initializeContext: (ctx: any) => NewContext
}
export interface Stoppable {
  /**
   * Middleware that executes at the stop of the application, in the order it was registered
   */
  stop: UsableMiddleware<Ingress<any>>['middleware']
}
export interface UsableMiddleware<T> {
  /**
   * Middleware that executes in the middleware of the application
   */
  middleware: (context: T, next: NextFn) => ReturnType<NextFn>
}
export interface Usable<Context extends CoreContext = CoreContext, NewContext = EmptyExtend> {
  stop: Stoppable['stop']
  middleware: UsableMiddleware<Context & NewContext>['middleware']
}

/**
 * @public
 */
export type Addon<
  Context extends CoreContext = CoreContext,
  NewContext = EmptyExtend,
  Decorations = EmptyExtend
> =
  | Usable<Context, Decorations>
  | (Ingress<Context & NewContext> & Decorations)
  | (Usable<Context, NewContext> & UsableMiddleware<Context & NewContext>['middleware'])

export const guards = {
  isStartable,
  isContextInitializer,
  isStoppable,
  isMiddleware,
  hasMiddleware,
  checkUsableMiddleware,
  canStart,
}

function isStartable(usable: any): usable is Startable {
  return checkPropertyIsFunctionOrGetter(usable, 'start')
}
function isContextInitializer<T>(usable: any): usable is ContextInitializer<T> {
  return checkPropertyIsFunctionOrGetter(usable, 'initializeContext')
}
function isStoppable(usable: any): usable is Stoppable {
  return checkPropertyIsFunctionOrGetter(usable, 'stop')
}

function hasMiddleware<T>(usable: any): usable is UsableMiddleware<T> {
  const descriptor = getDescriptor(usable, 'middleware')
  return typeof descriptor?.value === 'function' || typeof descriptor?.get === 'function'
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
  if (state & AppState.Running || state & AppState.Started || state & AppState.Starting) {
    return false
  }
  return true
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
