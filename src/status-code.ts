import { STATUS_CODES } from 'http'

function camelize (val: string) {
  return val
    .split(/\s|-/)
    .map(a=> a[0].toUpperCase() + a.slice(1).toLowerCase())
    .join('')
    .replace(/'/g,'')
}

//node -e "var c; Object.keys(c=require('http').STATUS_CODES).forEach(x => console.log(c[x].split(/\s|-/).map(a=>a[0].toUpperCase()+a.slice(1).toLowerCase()).join('').replace(/'/g,'')))"
//v6.9.3
export interface StatusCodes {
  Continue: number
  SwitchingProtocols: number
  Processing: number
  Ok: number
  Created: number
  Accepted: number
  NonAuthoritativeInformation: number
  NoContent: number
  ResetContent: number
  PartialContent: number
  MultiStatus: number
  AlreadyReported: number
  ImUsed: number
  MultipleChoices: number
  MovedPermanently: number
  Found: number
  SeeOther: number
  NotModified: number
  UseProxy: number
  TemporaryRedirect: number
  PermanentRedirect: number
  BadRequest: number
  Unauthorized: number
  PaymentRequired: number
  Forbidden: number
  NotFound: number
  MethodNotAllowed: number
  NotAcceptable: number
  ProxyAuthenticationRequired: number
  RequestTimeout: number
  Conflict: number
  Gone: number
  LengthRequired: number
  PreconditionFailed: number
  PayloadTooLarge: number
  UriTooLong: number
  UnsupportedMediaType: number
  RangeNotSatisfiable: number
  ExpectationFailed: number
  ImATeapot: number
  MisdirectedRequest: number
  UnprocessableEntity: number
  Locked: number
  FailedDependency: number
  UnorderedCollection: number
  UpgradeRequired: number
  PreconditionRequired: number
  TooManyRequests: number
  RequestHeaderFieldsTooLarge: number
  UnavailableForLegalReasons: number
  InternalServerError: number
  NotImplemented: number
  BadGateway: number
  ServiceUnavailable: number
  GatewayTimeout: number
  HttpVersionNotSupported: number
  VariantAlsoNegotiates: number
  InsufficientStorage: number
  LoopDetected: number
  BandwidthLimitExceeded: number
  NotExtended: number
  NetworkAuthenticationRequired: number
  Empty: { [code: number]: number }
  [code: number] : string
}

export const StatusCode = Object.keys(STATUS_CODES).reduce((codes, code) => {
  codes[code] = STATUS_CODES[code]
  codes[camelize(codes[code])] = Number(code)
  return codes
}, {
  Empty: { 204: true, 205: true, 304: true }
} as any) as StatusCodes
