import type { Ingress, Middleware } from './core.js'
import type { Annotation, AnnotationFactory } from 'reflect-annotations'
import type { ContainerContext } from '@ingress/di'

export type Func<T = any> = (...args: any[]) => T

/**
 * Lifecycle stages of an app
 */
export enum AppState {
  /**
   * Indicates the app has not been run before
   */
  New = 0,
  /**
   * The App is initializing
   */
  Starting = 1,
  /**
   * The app is running
   */
  Started = 2,
  /**
   * The app is stopping
   */
  Stopping = 3,
  /**
   * The App is stopped after having been started
   */
  Stopped = 4,
}

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

/**
 * @public
 */
export interface Usable {
  /**
   * Middleware that executes on start of the application, in the order it was registered
   */
  start?: Middleware<Ingress<any>>
  /**
   * Middleware that executes at the stop of the application, in the order it was registered
   */
  stop?: Middleware<Ingress<any>>
  /**
   * Middleware that executes in the middleware of the application
   */
  middleware?: Middleware<any>
  /**
   * Context initialization method invoked synchronously before the application's middleware
   */
  initContext?: Func<any>
}

export type UsableType = RequireAtLeastOne<Usable>
/**
 * @public
 */
export type Addon<T extends ContainerContext> =
  | Annotation<UsableType>
  | AnnotationFactory<any>
  | UsableType
  | Middleware<T>
  | Ingress<T>
  | (UsableType & Middleware<T>)