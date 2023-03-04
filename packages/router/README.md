## @ingress/router

The ingress router is an ingress addon that operates in an app driven by the `@ingrss/http` (or similar) driver. It's purpose is to enable requests to be handled by Controllers (classes) and Routes (methods).

The `@ingress/router` plugin introduces the `@Controller` and `@Route` decorators.
`@Controller` exists on an instance, and facilitates dependency collection of groups of routes, which are declared by `@Route` decorated class methods.

### Example

```typescript
import { Router, Route } from '@ingress/router'

const router = new Router()
const { Controller } = router

@Controller('/group')
class RouteGroup {
  @Route.Get('/handler')
  handler() {
    return 'Hello World'
  }
}
```

The above example, declares a route at `/group/handler` that returns an `HTTP 200 OK` with a body content of `Hello World` and a Content-Type of `ttext/plain;charset=UTF-8`

Alternatively, instead of through decorators, routes can be defined using the API

### API






