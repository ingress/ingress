export default function (x) {
  return new Context(x)
}

export class Context {
  constructor ({req, res}) {
    this.req = req
    this.res = res
  }
}