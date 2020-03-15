<p align="center">
    <img src="logo.png" width="400" max-width="90%" alt="ingress" />
</p>

<p align="center">
install: <code>npm i ingress</code><br><br>a utility for building applications using typescript and node.js<br>
</p>

***Key Features***
 - Dependency Injection/Collection
 - Type Validation and Type Coercion
 - Versatile composable middleware (global, route, error, or third-party connect-compatible)

## Getting started (http):

```typescript
import ingress, { Route } from 'ingress'

const app = ingress(),
  { Controller, Service } = app

@Service
class MyService {
  greeting(name: string) {
    return `hello ${name}`
  }
}

@Controller
class MyController {
  constructor(private service: MyService) {}
  @Route.Get('input-json/:name')
  greeting(@Route.Path('name') name: string) {
    return this.service.greeting(name)
  }

  @Route.Parse()
  @Route.Get('input-buffer')
  buffer(@Route.Body() buffer: typeof Buffer) {
    return Buffer.isBuffer(buffer)
  }

  @Route.Parse({ stream: true })
  @Route.Get('input-stream')
  stream(@Route.Body() stream: NodeJS.ReadableStream) {
    return typeof stream.pipe === 'function'
  }
}

app.listen(1111)
```

## Dependency Injection and the Request Lifecyle

When a request occurs, the ingress dependency injection container (`app.container`) will create a new child container (`context.scope`). This child container will be used to instantiate any `Service` or `Controller` used during that request. You can optionally inject any `Service`s or `SingletonService`s into these other dependencies. Note, that a `Service` has a per-request life-cycle and therefore cannot be injected into a `SingletonService` which lives for the life of the owning container. You should avoid patterns that result in needing circular dependencies. However, you can access dependencies circularly, by dynamically requesting them via a child container, `context.scope.get(...)`.

## Type Validation and Type Coercion

To validate incoming types, Ingress uses metadata emitted by the compiler. Specifically,
The `tsconfig.json` must specify

```
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
```

A controller might have a method with the following signature:

```typescript
  @Route.Post('/')
  myControllerMethod(@Route.Body() age: number) {
    return typeof age === 'number' // true
  }
```

By default ingress defines a set of type converters that will convert number, string, boolean and date types. These converters are customizable via the `typeConverters` option.

For advanced run-time type coercion and validation and compile-time types with JSON schema, [`typed-json-schema`](https://github.com/sberan/typed-json-schema) is recommended.


## Application Middleware
Ingress applications are based on, and built with middleware.

Ingress middleware supports the following signature:
```typescript
interface Middleware<T extends Context>{
  (context: T, next: () => Promise<any>): Promise<any>
}
```
[Ingress middleware](https://github.com/calebboyd/app-builder) follows the [before/after](https://esbenp.github.io/2015/07/31/implementing-before-after-middleware/) pattern common in many web frameworks

Additionally, Ingress supports addons, an Ingress app is also an Ingress Addon.
```typescript

interface Addon {
  /**
   * An Ingress instance will call start on Addons in the order that they're added to it
   */
  start?(): Promise<any>
  /**
   * An Ingress instance will call stop on Addons in the reverse order that they're added to it
   */
  stop?(): Promise<any>
  /**
   * A middleware function that is added to the ingress instance
   */
  middleware?(): Middleware<T>
}
```

The `.use` method supports any combination of these two types. `Addon & Middleware | (Middleware | Addon)`

### Graceful shutdown

You can stop an ingress application by calling `.stop()`. Any addons will also have their stop method called, in the reverse order that they were added. Currently, `.close()` is an alias for `.stop()`

## HTTP Responses

Returning a value that is a json (pojo), text, html, byte array or stream, from a controller method decorated with `@Route.<HttpMethod>` will cause ingress to make a best guess at discovering the response properties. The content type, content length and status message, will be inferred. These can also be set explicitly on the `context.res` property which is a NodeJS.ServerResponse object, accessible throughout the request lifetime.

## Handling Errors

If an error is thrown during a request, by default, ingress will provide a 500 status code error, and write the status message text to the response body. e.g. "Internal Server Error". To control this behavior, you can provide an `onError` handler. This is the last opportunity to handle the error before a response is sent. If you handle the error with a custom response, you may choose set `context.error = null` and set `context.body` to the desired response.

A top level error handler might look like the following:

```javascript
const app = ingress({
  onError(context) {
    context.scope.get(Logger).logError(context.error)
    context.res.statusCode = 500
    context.body = { message: context.error?.message ?? 'Internal Server Error' }
    //Clearing the error indicates that it has been handled by you.
    context.error = null
    return Promise.resolve()
  }
})
```

If you wish to provide multiple error handlers, you can do so, using middleware.

```javascript
import ingress, { compose } from 'ingress'

const app = ingress({
  onError: compose([
    function errorHandlerOne (context, next) {

      return next()
    },
    function errorHandlerTwo (context, next) {

      return next()
    }
  ])
})


```
