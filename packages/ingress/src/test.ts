import { Route } from '@ingress/router'
import { ingress } from './ingress'

const app = ingress()

@app.router.Controller
export class MyController {
  @Route.Get('greet/:name')
  greeting(@Route.Param('name') name: string) {
    return `Hello ${name}`
  }
}
app.run()
