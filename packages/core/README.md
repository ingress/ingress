# @ingress/core

`@ingress/core` is a lifecycle container for composing applications.

## Example

An ingress application that supports routed http requests, may look like this:

```javascript
import ingress from '@ingress/core'
import http from '@ingress/http'
import router from '@ingress/router'

await ingress
  .use(http)
  .use(router)
  .start()

```

Each Addon (`http` and `router` in this example) can implement the all or part of the `Usable` interface.

```typescript
export interface Usable {
  start?: Middleware<Ingress<any>, Ingress<any>>>
  stop?: Middleware<Ingress<any>>
  middleware?: Middleware<any>
  initContext?: Func<any>
}
```

The Ingress app itself is also a Usable Addon, allowing composition of multiple applications.</br>
Building applications with this process model can facilitate future physical (process) separation as verticals in your business domain are discovered.</br>
An Addon can alternatively be a plain middleware function. Ingress Middleware is composed using the popular "Onion" model. Where each middleware can yield to the next middleware in the chain, and so on. Each resuming once the chain has returned.

## Public API Reference

Using the default module export `Ingress` instance:

### `ingress.use(addon: Addon): Ingress`

Arguments:
- addon: Addon //TODO LINK

Returns the `ingress` instance, useful for chaining `.use` calls.

### `ingress.start([, app, next]): Promise<Ingress>`

Arguments:
- app: Ingress - optional parent app
- next: ContinuationMiddleware - optional continuation function

Returns the ingress instance. </br>

Starts ingress and any registered addons. Addon's can additionally register more addons in the startup sequence, until the `ingress.readyState` is `AppState.Started`

### `ingress.stop([, app, next]): Promise<Ingress>`

Arguments:
- app: Ingress - optional parent app
- next: ContinuationMiddleware - optional continuation function

Returns the ingress instance. </br>

**Note:** `ingress.start` and `ingress.stop` are slightly different from the Usable analogs, in that their parameters are optional. The root app, will invoke a sub-app's method with the appropriate arguments, typically no arguments should be passed when calling the root start or stop methods.

### `ingress.middleware([, ctx, next]): Promise<void>`

Arguments:
- ctx: any - optional context argument to be passed to each registered middleware
- next: ContinuationMiddleware - optional continuation function

Invokes the registered chain of middleware, If no context object is passed, one is created. The passed or default `ctx` argument is passed to each Addon's initContext method synchronously, and then passed to the middleware. Note that the order of middleware registration matters if the middleware has listed dependencies.

### Type `Addon`

An ingress Addon has the following TypeScript signature

```typescript
type Addon<T extends ContainerContext> =
  | UsableType
  | Middleware<T>
  | Ingress<T>
  | (UsableType & Middleware<T>)
  | Annotation<UsableType>
  | AnnotationFactory<UsableType>
```
#### `UsableType`
```typescript
type UsableType = RequireAtLeastOne<Usable>
```
#### `Middleware`
```typescript
type Middleware<T, R = any> = (ctx: T, next: ContinuationMiddleware<T>): R | Promise<R>
```
### `ContinuationMiddleware`
```typescript
type ContinuationMiddleware<T, R = any> = (ctx?: T, next?: ContinuationMiddleware<T>): R | Promise<R>
```

### `AnnotationFactory` and `Annotation`

These types are respectively the result of `createAnnotationFactory` and the created factory's own result. From the `reflect-annotations` package.


