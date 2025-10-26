<p align="center">
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ingress/ingress/HEAD/packages/ingress/logo-dark.png">
  <img width="400" max-width="90%" alt="ingress logo" src="https://raw.githubusercontent.com/ingress/ingress/HEAD/packages/ingress/logo.png">
</picture>
</p>
<p align="center">
install: <code>npm i ingress</code><br><br>a utility for building applications using TypeScript or JavaScript
</br>
</br>
  <a href="https://github.com/ingress/ingress/actions"><img src="https://github.com/ingress/ingress/workflows/Ingress%20CI/badge.svg?branch=dev" alt="Ingress CI"></a>
  <a href="https://www.npmjs.com/package/ingress"><img src="https://img.shields.io/npm/v/ingress.svg" alt="Version"></a>
  <a href="https://github.com/ingress/ingress/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/ingress.svg" alt="License"></a>
</p>

## Getting started (web):

```typescript
//@filename: greet.ts
import  { Routes, Route } from 'ingress'

@Routes('/greet')
export class MyRoutes {
    @Route.Get("/:name")
    greeting(@Route.Param("name") name: string) {
        return `Hello ${name}`
    }
}

//@filename: app.ts
import { fromGlobalContext } from 'ingress'
const app = fromGlobalContext()
app.run().then((app) => {
  console.log('Running at )
})
