# ingress

install: `npm i ingress`

A small abstraction around the [http.Server] class that uses [promise-based middleware]

```javascript
import ingress, { ParseBody, Route, Param } from 'ingress'

const app = ingress(),
  { Controller, Service } = app

@Service()
class MyService {
  greeting(name: string) {
    return `hello ${name}`
  }
}

@Controller()
class MyController {
  constructor(private service: MyService) {}
  @Route.Get('input-json/:name')
  greeting(@Param.Path('name') name: string) {
    return this.service.greeting(name)
  }

  @ParseBody()
  @Route.Get('input-buffer')
  buffer(@Param.Body() buffer: typeof Buffer) {
    return Buffer.isBuffer(buffer)
  }

  @ParseBody({ stream: true })
  @Route.Get('input-stream')
  stream(@Param.Body() stream: NodeJS.ReadableStream) {
    return typeof stream.pipe === 'function'
  }
}

app.listen(1111)
```



[http.Server]: https://nodejs.org/api/http.html#http_class_http_server
[promise-based middleware]: https://github.com/calebboyd/app-builder

