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
import  { Routes, Route } from 'ingress/global'

// Register a set of Routes with the global container
// with a basepath of `/greet`
@Routes('/greet')
export class MyController {
    @Route.Get("/:name")
    // Pluck the route parameter named 'name' from variable route segment
    greeting(@Route.Param("name") name: string) {
        //This route is type safe
        return `Hello ${name}`
    }
}
