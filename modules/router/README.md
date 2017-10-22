### @ingress/router
Decorator based router middleware for [`ingress`](https://github.com/ingress/core)

`npm i @ingress/router`

Define routes using the `@Route` decorator, and plain javascript classes.

## Route Definition

```javascript
import { Route, Param } from '@ingress/router'

@Route('prefix')
export class MyController {

  @Route.Get('/echo/:echo')
  someRouteHandler (@Param.Path('echo') echo) {
    return 'Echoing ' + echo
  }
}
// GET /prefix/echo/something ===> something
```

## Getting started

```javascript
import { Server, DefaultMiddleware } from 'ingress'
import { Router } from '@ingress/router'
import { MyController } from './my-controller'

const app = new Server()

app
  .use(new DefaultMiddleware())
  .use(new Router({ controllers: [MyController] }))
  .listen(8888)
  .then(() => console.log('started'))
```

## Exports

### **Router** (routerOptions): class

 - **RouterOptions\<T\>: object**
   - **controllers: Array\<Type\>** (required)
   - **baseUrl: string**
     - Define the base url. Defaults to `'/'`
   - **resolveController\<C\>(context: T, controller: Type\<C\>): C**
     - resolve the controller instance. By default it return the result of `new C()`
     - If used in conjunction with [@ingress/di](https://github.com/ingress/di)
     The controller will be requested from the current `context.scope` injector
   - **isRoutable: (def: RouteMeatdata) => boolean**
     - Identify a class method as routable. Defaults to methods with a `@Route` decorator
   - **getMethods: (def: RouteMetdata) => string[]**
     - Identify the http methods for the route. Defaults to methods defined with a `@Route` decorator
   - **getPath: (baseUrl: string, def: RouteMetadata) => string**
     - Identify the path for the route. Defaults to paths defined with a `@Route` decorator

### **Route** : (route: string, ...methods: string[]) => ClassDecorator | MethodDecorator

 - Create a decorator that defines a route with a path and method(s)
   - Additional helper methods:
     - `Route.Get`
     - `Route.Post`
     - `Route.Put`
     - `Route.Delete`
     - `Route.Patch`
 - The `@Route` decorator can be used on classes and class methods.
    - The default behavior will concatenate parent-child (class-method) declarations
 - It can accept additional `Route` methods, or strings, as rest parameters.
   - `@Route('/some/route', Route.Post, 'Put')`

### **ParseBody**: (subtextOptions) => MethodDecorator

 - Create a body parser decorator based on [subtext](https://github.com/hapijs/subtext)

---

### Defining middleware

Arbirary middleware can be defined on any handler using the reflection property `'annotations'`.

```javascript
import { createAnnotationFactory } from 'reflect-annotations'

class FancyAnnotation {
  constructor (fancyOrNot) {
    this.fancy = fancyOrNot
  }
  middleware () {
    return (context, next) => {
      context.isFancy = this.fancyOrNot
      next()
    }
  }
}

export const Fancy = createAnnotationFactory(FancyAnnotation)
```

Using `@Fancy(true)` on any handler or controller will add the middleware function to the execution of the desired handler or handler(s) respectively.
