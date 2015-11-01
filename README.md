## server.app-builder

install: `npm install server.app-builder`

An abstraction over the [http.Server] class that uses [promise-based middleware]

```javascript
import { Server } from 'server.app-builder'

const app = new Server()

app.use(async (env, next) => {
  let start = Date.now()
  await next()
  env.res.end('Hello World')
  console.log(`request took ${Date.now() - start} milliseconds`)
})

app.listen(8080)
  .then(() => console.log('Listening on port 8080'))
```

The argument passed to the middleware functions includes `req` and `res` properties. Which are instances of [http.IncomingMessage] and [http.ServerResponse] respectively. The argument can be modified arbitrarily by the middleware functions and is created per request.

The module has two named exports: `Server` and `Context`; and the default export -- a factory for creating `Server` instances


[http.IncomingMessage]: https://nodejs.org/api/http.html#http_http_incomingmessage
[http.ServerResponse]: https://nodejs.org/api/http.html#http_class_http_serverresponse
[http.Server]: https://nodejs.org/api/http.html#http_class_http_server
[promise-based middleware]: https://github.com/calebboyd/app-builder

