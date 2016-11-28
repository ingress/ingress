# ingress

install: `npm i ingress`

A small abstraction around the [http.Server] class that uses [promise-based middleware]

If you use javascript, just ignore the type annotations in the following example.

```javascript
import ingress, { Context, DefaultMiddleware } from 'ingress'

const app = ingress<Context>()

app
.use(new DefaultMiddleware<Context>({
  onError (context) {
    console.log(context.error)
  }
}))
.use((context, next) => {
  context.body = "Hello World"
  return next()
})
.listen(8080).then(() => console.log('Listening on port 8080'))
```

## Server\<T extends DefaultContext\<T\>\> (options?: ServerOptions): Class

- **ServerOptions\<T\>** Object Interface:
  - **server?: http.Server**
    - provide an existing http server
  - **contextFactory?: \<T\>({ req: IncomingMessage, res: ServerResponse}) => T**
    - provide an alternate factory function for per-request context creation

#### webserver: http(s).Server
- Underlying http server implementation

#### listen (...listenArguments): Promise\<void\>
- The listen method takes the same arguments as the `net.Server.prototype.listen` method except it returns a promise, in lieu of accepting a callback.

#### use (addon: MiddlewareAddon\<T\> | Addon\<T\> | MiddlewareOptions\<T\>): Server\<T\>

- **MiddlewareAddon\<T\>** Function Interface:
  - **(context: T, next: () => Promise\<void\>): any**
  - **register?(server: Server\<T\>): Promise\<void\>**
    - Optionally register a server addon. The resulting promise is waited upon, and resolved before binding the server to a port (`listen`)

- **Addon\<T\>** Object Interface:
  - **register (server: Server\<T\>): Promise\<void\>**
    - Register a server addon. The resulting promise is waited upon, and resolved before binding the server to a port (`listen`)

- **MiddlewareOptions\<T\>** Object Interface:
  - **middleware: Middleware\<T\>**
    - An object that exposes a bound (dereferencable) middleware function


#### close (): Promise\<void\>
- Shudown the server.

## DefaultContext\<T\>: Object Interface
- Baseclass implementation: **BaseContext\<T\>**. Implementation: **Context** (BaseContext\<Context\>),

#### req: IncomingMessage & { context: T }

#### res: ServerResponse & { context: T }

#### error: Error | null | undefined

#### body: any
- Response body content

#### handleError?: (error?: Error) => any | any

#### handleError?: () => any


The `context` argument passed to the middleware functions includes `req` and `res` properties. Which are instances of [http.IncomingMessage] and [http.ServerResponse] respectively.
The `req` and `res` properties also have a `.context` property, a (circular) reference to the primary context object. The argument can be modified arbitrarily by the middleware functions and is created per request.

Ingress has the following exports
- createServer (default)
- Server
- Ingress (Server alias)
- Context
- createContext
- BaseContext\<T\>
- DefaultMiddleware\<T\>

Additionally, the necessary TypeScript interfaces are exposed.

#### Supported Middleware
- [di.middleware](https://github.com/calebboyd/di.middleware)
- [router.middleware](https://github.com/calebboyd/router.middleware)



[http.IncomingMessage]: https://nodejs.org/api/http.html#http_class_http_incomingmessage
[http.ServerResponse]: https://nodejs.org/api/http.html#http_class_http_serverresponse
[http.Server]: https://nodejs.org/api/http.html#http_class_http_server
[promise-based middleware]: https://github.com/calebboyd/app-builder

