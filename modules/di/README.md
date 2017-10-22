## @ingress/di

Server-side dependency injection middleware for ingress

Based on [angular di](https://github.com/calebboyd/angular.di)

### Example (ES2015)

```javascript
import ingress from '@ingress/core'
import di from '@ingress/di'
import {
  perRequestProviders,
  providers,
  SomeDependency
} from './my-dependencies'

const app = ingress(),
  container = di({ providers, perRequestProviders })

app
  .use(container)
  .use((context, next) => {
    const someDep = context.scope.get(SomeDependency)
    ...
  })
```

### Configuration

There are a few ways to let the root container know about your dependencies and their lifetimes.
  1. Provide them at creation time (shown in example)
  2. Use `.Singleton` and `.PerRequestLifetime` decorators exposed on a container instance
  3. Builder (TODO) -  Use a container builder to discover, configure, and load dependencies.

#### Decorator Configuration example

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
import ingress from '@ingress/core'
import { container } from './configuration'
import { MyDependency } from './my-dependency'

const app = ingress()
app.use(container).use((context, next) => {
  const dep = context.scope.get(MyDependency)
  ...
})
```
It is important to note that in `index.js` loading `./my-dependency` _after_ `./configuration` is required.
