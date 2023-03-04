import { RouteAnnotation } from './annotations/route.annotation.js'
import type { HttpMethod } from 'router-tree-map'
import type { Type } from '@ingress/core'
import { Annotation, AnnotationFactory, isAnnotationFactory } from 'reflect-annotations'

export type RouteMetadata = {
  controller: Type<any>
  name: string
  controllerAnnotations?: Array<any>
  methodAnnotations?: Array<any>
  parameterAnnotations?: Array<any>
  types?: {
    parameters?: any[]
    return?: any
  }
}
export type PathMap = { [key in HttpMethod]: string[] }

function maybeUnwrapAnnotation(
  x: Annotation<RouteAnnotation> | AnnotationFactory<RouteAnnotation>
) {
  if (isAnnotationFactory(x)) return x().annotationInstance
  if (x && 'annotationInstance' in x) return x.annotationInstance
  return x
}

function isRouteAnnotation(x: any): x is RouteAnnotation {
  return Boolean(x.isRouteAnnotation)
}

/**
 * Given a base URL and and Route Metadata, determine the desired paths
 * @param route
 * @param baseUrl
 */
export function resolvePaths(route: RouteMetadata, baseUrl = '/'): PathMap {
  const parents =
      route.controllerAnnotations?.map(maybeUnwrapAnnotation).filter(isRouteAnnotation) ?? [],
    children = route.methodAnnotations?.map(maybeUnwrapAnnotation).filter(isRouteAnnotation) ?? [],
    paths = {} as PathMap

  let resolveFrom = '/'
  if (!children.length) {
    throw new Error('Must provide at least one route with a method')
  }
  if (parents.length) {
    resolveFrom = baseUrl
  } else {
    parents.push(new RouteAnnotation(baseUrl))
  }

  for (const parent of parents) {
    for (const child of children) {
      if (!child.methods.length && !parent.methods.length) {
        throw new Error(`${route.controller.name}.${route.name} has no Http Method defined`)
      }
      if (child.methods.length && parent.methods.length) {
        throw new Error(
          `${route.controller.name}.${route.name} must provide Http Methods on the base OR sub route, but not both`
        )
      }
      const methods = parent.methods.length ? parent.methods : child.methods,
        resolvedPath = parent.resolvePath(resolveFrom, child)

      for (const m of methods) {
        const method = m as keyof PathMap
        paths[method] = paths[method] || []
        paths[method].push(resolvedPath)
      }
    }
  }
  return paths
}
