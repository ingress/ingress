export default function (x) {
  return new Environment(x)
}

export class Environment {
  constructor ({req, res}) {
    this.req = req
    this.res = res
  }
}