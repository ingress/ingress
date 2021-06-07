import { RouteAnnotation } from './annotations/route.annotation.js'
import type { AnnotatedPropertyDescription } from 'reflect-annotations'
import type { HttpMethod } from 'router-tree-map'

export type RouteMetadata = Omit<AnnotatedPropertyDescription, 'declaredOrder'>
export type PathMap = { [key in HttpMethod]: string[] }

function isRouteAnnotation(x: any): x is RouteAnnotation {
  return Boolean(x.isRouteAnnotation)
}

/**
 * Given a base URL and and Route Metadata, determine the desired paths
 * @param route
 * @param baseUrl
 */
export function resolvePaths(route: RouteMetadata, baseUrl = '/'): PathMap {
  const parents = route.classAnnotations.filter(isRouteAnnotation),
    children = route.methodAnnotations.filter(isRouteAnnotation),
    paths = {} as PathMap

  let resolveFrom = '/'
  if (!children.length) {
    throw new Error('Must provide at least one path')
  }
  if (parents.length) {
    resolveFrom = baseUrl
  } else {
    parents.push(new RouteAnnotation(baseUrl))
  }

  for (const parent of parents) {
    for (const child of children) {
      if (!child.methods.length && !parent.methods.length) {
        throw new Error(`${route.parent.name}.${route.name} has no Http Method defined`)
      }
      if (child.methods.length && parent.methods.length) {
        throw new Error(
          `${route.parent.name}.${route.name} must provide Http Methods on the base OR sub route, but not both`
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
