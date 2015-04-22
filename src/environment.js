export class Environment {

  constructor ({request, response}) {
    this.request = request
    this.response = response
  }
}

export default function (...args) {
  return new Environment(...args)
}