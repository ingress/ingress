<p align="center">
  <img src="https://raw.githubusercontent.com/ingress/ingress/HEAD/modules/ingress/logo.png" width="400" max-width="90%" alt="ingress" />
</p>
<p align="center">
install: <code>npm i ingress</code><br><br>a utility for building applications using typescript and node.js<br>
</p>

<a href="https://github.com/ingress/ingress/actions"><img src="https://github.com/ingress/ingress/workflows/Ingress%20CI/badge.svg?branch=dev" alt="Ingress CI"></a>
<a href="https://www.npmjs.com/package/ingress"><img src="https://img.shields.io/npm/v/ingress.svg" alt="Version"></a>
<a href="https://github.com/ingress/ingress/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/ingress.svg" alt="License"></a>

**_Key Features_**

- Great Developer Experience
- Dependency Injection, Discovery, IoC and lifecycle management
- Runtime type validation and coercion
- Composable middleware

## Getting started (http):

```typescript
import ingress, { Route } from "ingress";

class MyController {
  @Route.Get("input-json/:name")
  greeting(@Route.Path("name") name: string) {
    return `Hello ${name}`
  }
}

ingress(MyController)
  .listen(1111)
  .then(x => `Listening on ${x.port}`)
```

## Dependency Injection, Discovery, and IoC

Each ingress app has a parent dependency injection container created from `@ingress/di`. Registering services or controllers can be done at app creation time, or using the collector decorators, after the app has been created, but not started. This facilitates a flexible dependency registration pattern, where the app can depend on the controllers, or, the controllers can depend on the app, With the example above, this would require each expression to be its own module (app, service, controller, startup respectively)

When a request occurs, the ingress dependency injection container (`app.container`) will create a new child container (`context.scope`). This child container will be used to instantiate any `Service` or `Controller` used during that request. You can optionally inject any `Service`s or `SingletonService`s into these other dependencies. Note, that a `Service` has a per-request life-cycle and therefore cannot be injected into a `SingletonService` which lives for the life of the owning container. You should avoid patterns that result in needing circular dependencies. However, you can access dependencies circularly, by dynamically requesting them via a child container, `context.scope.get(...)`.

## Runtime type validation and coercion

To validate incoming data, Ingress uses metadata emitted by the compiler. Specifically,
The `tsconfig.json` must specify these options, which are already inherent for use using decorators.

```
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
```

Specifically, these options cause typescript to emit rich type data for decorated classes.
A controller might have a method with the following signature:

```typescript
  @Route.Post('/')
  toNumber(@Route.Body() age: number) {
    return typeof age === 'number' // true
  }
```

By default ingress defines a set of type converters that will convert number, string, boolean and date types. These converters are customizable via the `typeConverters` option.
Or, custom types that have a static `convert` function will be automatically used as their own type converter.

For example, a custom type might look like the following:

```typescript
class MyType {
  static convert(value: any) {
    return new MyType(Number(value));
  }
  constructor(public value: any) {}
}

//Note: an error in the `convert` method will cause a HTTP 400 StatusCode failure
@Route.Post('/')
toNumber(@Route.Body() body: MyType) {
  return typeof body.value === 'number' // true
}

```

For advanced run-time type coercion and validation and compile-time types using JSON schema, [`tjs`](https://github.com/sberan/typed-json-schema) is recommended.

## Middleware

Ingress applications are based on, and built with middleware.
Ingress function middleware supports the following signature:

```typescript
interface Middleware<T> {
  (context: T, next: () => Promise<any>): Promise<any>;
}
```

[Ingress middleware](https://github.com/ingress/app-builder) follows the [before/after](https://esbenp.github.io/2015/07/31/implementing-before-after-middleware/) pattern common in many web frameworks

Additionally, Ingress supports addons, an Ingress app is also an Ingress Addon.

```typescript
interface Addon {
  /**
   * An Ingress instance will call start on Addons in the order that they're added to it
   */
  start?: (app: Ingress) => Promise<any>;
  /**
   * An Ingress instance will call stop on Addons in the reverse order that they're added to it
   */
  stop?: (app: Ingress) => Promise<any>;
  /**
   * A middleware function that is added to the ingress instance
   */
  middleware?: Middleware<T>;
}
```

The `.use` method supports any combination of these two types. `Addon & Middleware | (Middleware | Addon)`

### Graceful shutdown

You can stop a listening ingress application by calling `.close()`. Any addons will also have their stop method called, in the reverse order that they were added.

## HTTP Responses

Returning a value that is a json (pojo), text, html, byte array or stream, from a controller method decorated with `@Route.<HttpMethod>` will cause ingress to make a best guess at discovering the response properties. The content type, content length and status message, will be inferred. These can also be set explicitly on the `context.res` property which is a NodeJS.ServerResponse object, accessible throughout the request lifetime.

## Handling Errors

If an error is thrown during a request, by default, ingress will provide a 500 status code error, and write the status message text to the response body. e.g. "Internal Server Error". To control this behavior, you can provide an `onError` handler. This is the last opportunity to handle the error before a response is sent. If you handle the error with a custom response, you may choose set `context.error = null` and set `context.body` to the desired response.

A top level error handler might look like the following:

```typescript
const app = ingress({
  onError(context) {
    context.scope.get(Logger).logError(context.error);
    context.res.statusCode = 500;
    context.body = {
      message: context.error?.message ?? "Internal Server Error",
    };
    //Clearing the error indicates that it has been handled by you.
    context.error = null;
    return Promise.resolve();
  },
});
```

If you wish to provide multiple error handlers, you can do so, using middleware.

```javascript
import ingress, { compose } from "ingress";

const app = ingress({
  onError: compose([
    function errorHandlerOne(context, next) {
      return next();
    },
    function errorHandlerTwo(context, next) {
      return next();
    },
  ]),
});
```
