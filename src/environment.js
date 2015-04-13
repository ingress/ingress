export default class Environment {

  static create (req, res) {
    return new Environment(req, res);
  }

  constructor (request, response) {
    this.request = request
    this.response = response
  }
}