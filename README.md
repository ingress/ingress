## di

Server-side dependency injection for ingress

### Example (ES2015)

```javascript
import createApp from 'ingress'
import di from 'ingress.di'
import {
  perRequestLifetimeProviders,
  singletons,
  SomeDependency
} from './my-dependencies'

const app = createApp()

app
  .use(di({ singletons, perRequestLifetimeProviders }))
  .use((context, next) => {
    const someDep = context.scope.get(SomeDependency)
    ...
  })
```
