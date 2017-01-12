## @ingress/di

Server-side dependency injection middleware for ingress

Based on [angular di](https://github.com/calebboyd/angular.di)

### Example (ES2015)

```javascript
import ingress from '@ingress/core'
import di from '@ingress/di'
import {
  perRequestLifetimeProviders,
  singletons,
  SomeDependency
} from './my-dependencies'

const app = ingress()

app
  .use(di({ singletons, perRequestLifetimeProviders }))
  .use((context, next) => {
    const someDep = context.scope.get(SomeDependency)
    ...
  })
```

### Configuration

As an alternative (or in addition) to the options provided at creation,
decorators are exposed on the container instance allowing registration/collection of
the initial singleton/per-request-lifetime dependencies.

Eg:

```javascript
//configuration.js

import di from '@ingress/di'

const container = di()
const { Singleton, PerRequestLifetime } = container

export {
  container,
  Singleton,
  PerRequestLifetime
}

//my-dependency.js

import { Singleton } from './configuration'

@Singleton
export class MyDependency {
  ...
}

//index.js

import { MyDependency } from './my-dependency'
import { container } from './configuration'
import ingress from '@ingress/core'

const app = ingress()
app.use(container).use((context, next) => {
  const dep = context.scope.get(MyDependency)
  ...
})

```
