# @ingress/core

`@ingress/core` is a lifecycle container for ecmascript applications

`@ingress/core` manages:
- middleware composition
- startup and shutdown
- dependency injection
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


### Why all the classes?

Sometimes classes are viewed as a code smell. While this can certainly be the case, they offer a mechanism of carrying synctactic metadata which can prove useful. Any paradigm can be abused. It's important to make any implementation a focused one.
The goal with ingress is to make composition of your applications easy. So prefer the composition of parts that is catered to.
