import { Routes, Route } from 'ingress'

@Routes('/greet')
export class MyRoutes {
  @Route.Get('/:name')
  greeting(@Route.Param('name') name: string) {
    return `Hello ${name}`
  }
}
