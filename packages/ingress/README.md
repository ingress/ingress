<p align="center">
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ingress/ingress/HEAD/packages/ingress/logo-dark.png">
  <img width="400" max-width="90%" alt="ingress logo" src="https://raw.githubusercontent.com/ingress/ingress/HEAD/packages/ingress/logo.png">
</picture>
</p>
<p align="center">
install: <code>npm i ingress</code><br><br>a utility for building applications using typescript and node.js<br>
</p>

<a href="https://github.com/ingress/ingress/actions"><img src="https://github.com/ingress/ingress/workflows/Ingress%20CI/badge.svg?branch=dev" alt="Ingress CI"></a>
<a href="https://www.npmjs.com/package/ingress"><img src="https://img.shields.io/npm/v/ingress.svg" alt="Version"></a>
<a href="https://github.com/ingress/ingress/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/ingress.svg" alt="License"></a>

## Getting started (web):


```typescript
//@filename: app.ts
import ingress, { Route } from "ingress";

class MyController {
    @Route.Get("/greet/:name")
    greeting(@Route.Param("name") name: string) {
        return `Hello ${name}`
    }
}

export const app = ingress(MyController)

//@filename: package.json
{
    "scripts": {
        "start": "ing start app.ts"
    }
}
```

## Ingress CLI

The ingress cli (`ing`) is provided to support composition of multiple ingress applications.
For the single file example above, it is roughly equivalent of running the following javascript:
```typescript
import('./app').then(x => x.app.run())
```
For running multiple ingress applications together, specify more modules with an `app` export.

```bash
ing start app.ts app2.ts app3.ts
```
If your deployment environment does not contain the cli, you can choose to `build` instead.

```
ing build app.js
```


Various targets are supported


```typescript
type Middleware<T> = (context: T, next: () => Promise<void>)
  => Promise<void>;
```

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
