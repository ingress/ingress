### @ingress/http

@ingress/http is a middleware driver for ingress.

### Usage

```typescript
import { Ingress } from '@ingress/core'
import { Http } from '@ingress/http'

const app = new Ingress()
app.use(new Http())
await app.run()
```
