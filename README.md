## server.app-builder

install: `npm install server.app-builder`

An abstraction over the [http.Server] class that uses promise-based middleware

```javascript
import server from 'server.app-builder'

let app = server()

app.use(async (env) => {
  let start = Date.now();  
  await env.next();
  env.response.end('Hello');
  console.log(`request took ${Date.now() - start} milliseconds`);
})

app.listen(8080)
  .then(() => console.log('Listening on port 8080'))
```

A Server instance is also an [AppBuilder] instance.

The argument passed to the middleware functions includes `request` and `response` properties. Which are instances of [http.IncomingMessage] and [http.ServerResponse] respectively. The argument can be modified arbitrarily by the middleware functions and is created per request.

The module has two named exports: `Server` and `Environment`; and the default export -- a factory for creating `Server` instances


[http.IncomingMessage]: https://iojs.org/api/http.html#http_http_incomingmessage
[http.ServerResponse]: https://iojs.org/api/http.html#http_class_http_serverresponse
[http.Server]: https://iojs.org/api/http.html#http_class_http_server
[AppBuilder]: https://github.com/calebboyd/app-builder

