## server.app-builder

install: `npm install server.app-builder`

An abstraction over the [http.Server](server) class that uses promise-based middleware

```javascript
import Server from 'server'

let server = new Server()

server.use(async (env) => {
  let start = Date.now();
  await env.next();
  env.response.end('Hello');
  console.log(`request took ${Date.now() - start} milliseconds`);
})

server.listen(8080)
  .then(() => console.log('Listening on port 8080'))
```

A Server instance is also an [AppBuilder](ab) instance.

The argument passed to the middleware functions includes `request` and `response` properties. Which are instances of [http.IncomingMessage](icm) and [http.ServerResponse](sr) respectively. The argument can be modified arbitrarily by the middleware functions and is created per request.


[icm]: https://iojs.org/api/http.html#http_http_incomingmessage
[server]: https://iojs.org/api/http.html#http_class_http_server
[ab]: https://github.com/calebboyd/app-builder
[sr]: https://iojs.org/api/http.html#http_class_http_serverresponse
