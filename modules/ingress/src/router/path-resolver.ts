import { Type } from './controller-annotation'
import { RouteAnnotation } from './route.annotation'
import { AnnotatedPropertyDescription } from 'reflect-annotations'

const isRouteAnnotation = (x: any) => Boolean(x.isRouteAnnotation)

/**
 * @public
 */
export type RouteMetadata = AnnotatedPropertyDescription & { controller: Type<any> }

/**
 * Given a base URL and and Route Metadata for a class, determine the desired paths
 * @param baseUrl
 * @param route
 */
export function resolvePaths(baseUrl = '/', route: RouteMetadata): { [method: string]: string[] } {
  const parents = route.classAnnotations.filter(isRouteAnnotation) as RouteAnnotation[],
    children = route.methodAnnotations.filter(isRouteAnnotation) as RouteAnnotation[],
    paths: { [method: string]: string[] } = {}

  let resolveFrom = '/'

  if (parents.length) {
    resolveFrom = baseUrl
  } else {
    parents.push(new RouteAnnotation(baseUrl))
  }

  parents.forEach((parent) => {
    children.forEach((child) => {
      if (!child.methods.length && !parent.methods.length) {
        throw new Error(`${route.controller.name}.${route.name} has no Http Method defined`)
      }
      if (child.methods.length && parent.methods.length) {
        throw new Error(
          `${route.controller.name}.${route.name} must provide Http Methods on class OR method, but not both`
        )
      }
      const methods = parent.methods.length ? parent.methods : child.methods,
        resolvedPath = parent.resolvePath(resolveFrom, child)

      methods.forEach((m) => {
        paths[m] = paths[m] || []
        paths[m].push(resolvedPath)
      })
    })
  })
  return paths
}
