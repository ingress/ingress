# @ingress/core

install: `npm i @ingress/core`

A small abstraction around the [http.Server] class that uses [promise-based middleware]

```javascript
import ingress, { DefaultMiddleware } from 'ingress'

const app = ingress(),
  defaultMiddleware = new DefaultMiddleware({
    onError: ({ error }) => console.log(error)
  })

app.use(defaultMiddleware)
  .use((context, next) => {
    context.body = 'Hello World'
    return next()
  })
  .listen(8080)
  .then(() => console.log('Listening on port 8080'))
```

Ingress Core provides a `DefaultMiddleware` export. The middleware contsructor accepts an options argument with an `onError` handler which
is called whenever an error occurs during a request. Additionally, setting the `context.body` property to one of
the following types `String | Buffer | Stream | Object` will provide best guess headers and content length responses.


## Ingress\<T extends DefaultContext\<T\>\> (options?: ServerOptions): Class

- **ServerOptions\<T\>** Object Interface:
  - **server?: http.Server**
    - provide an existing http server
  - **contextFactory?: \<T\>({ req: IncomingMessage, res: ServerResponse}) => T**
    - provide an alternate factory function for per-request context creation

#### webserver: http(s).Server
- Underlying http server implementation

#### listen (...listenArguments): Promise\<void\>
- The listen method takes the same arguments as the `net.Server.prototype.listen` method except it returns a promise, in lieu of accepting a callback.

#### use (addon: Usable\<T\>): Server\<T\>

- **Usable\<T\>** Function & Object Interface:
  - **(context: T, next: () => Promise\<void\>): any**
  - **register?(server: Server\<T\>): Promise\<void\>**
    - Optionally register a server addon. The resulting promise is waited upon, and resolved before binding the server to a port after `listen` is called
  - **middleware: Middleware\<T\>**
    - de-referencable middleware function property

#### close (): Promise\<void\>
  - Shudown the server.

#### build (): Promise\<void\>
  - get a callback made up of all middleware, suitble for use as a server request handler

## DefaultContext\<T\>: Object Interface
  - Implemented with: **Context** (BaseContext\<Context\>) - factory: createContext,

#### req: Request\<T\>
  - [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) & { context: T }

#### res: Response\<T\>
  - [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse) & { context: T }

#### error: Error | null | undefined

#### body: String | Buffer | Stream | Object
  - Response body content

#### handleError?: (error?: Error) => any | any

#### handleResponse?: () => any

Ingress has the following exports
- Ingress\<T\> (alias: Server, factory: default export)
- Context
- createContext
- DefaultMiddleware\<T\>

Additionally, the necessary TypeScript interfaces are exposed.

#### Supported Middleware
- [di](https://github.com/ingress/di)
- [router](https://github.com/ingress/router)

[http.Server]: https://nodejs.org/api/http.html#http_class_http_server
[promise-based middleware]: https://github.com/calebboyd/app-builder

