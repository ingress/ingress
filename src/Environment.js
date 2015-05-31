export class Environment {
  constructor ({request, response}) {
    this.request = request
    this.response = response
  }
}

export default function (x) {
  return new Environment(x)
}