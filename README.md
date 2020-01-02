<p align="center">
    <img src="logo.png" width="400" max-width="90%" alt="ingress" />
</p>

<p align="center">
install: <code>npm i ingress</code>
</p>





Ingress is a utility for building routable applications using Node.js and TypeScript.

### Getting started:

```typescript
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
