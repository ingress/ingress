class Request {}
class Response {}


export class Environment {
  constructor ({req, res}) {
    this.req = req
    this.res = res
    this.reqeust = new Request(req);
    this.response = new Response(res);
  }

  get requestBody () {

  }
}

export default function (x) {
  return new Environment(x)
}