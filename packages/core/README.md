# @ingress/core

`@ingress/core` is a lifecycle container for ecmascript applications

`@ingress/core` manages:
- middleware composition
- startup and shutdown
- the main application event (the driver)

## Example

The following example uses two Addons (`@ingress/http` and `@ingress/router`) To create an web server.

This will serve 404's since there are no defined routes.

```javascript
import core from '@ingress/core'
import http from '@ingress/http'
import router from '@ingress/router'

const app = core().use(http()).use(router())

app.run()
```

`app.run()` will activate the driver (http) and listen on the environment's defined PORT variable or a random port
A driver, is a middleware that responds to events and executes the core middleware



```typescript
export interface Usable<T> {
  start?: Middleware<Ingress<T>>
  stop?: Middleware<Ingress<T>>
  middleware?: Middleware<T>
  initializeContext?: Func
}
```

The Ingress app itself is also a Usable Addon, allowing nested applications to be composed.

An Addon can alternatively be a plain middleware function or anything fitting this type definition:

```typescript
type Addon<T> =
  | Usable<T>
  | Middleware<T>
  | Ingress<T>
  | (Usable<T> & Middleware<T>)
  | Annotation<Usable<T>>
  | AnnotationFactory<Usable<T>>
```


