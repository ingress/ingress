import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  ING_BAD_REQUEST,
  ING_CONTENT_LENGTH_MISMATCH,
  ING_CONTENT_LENGTH_REQUIRED,
  ING_INPUT_FAILED_VALIDATION,
  ING_NO_SERIALIZER,
  ING_PAYLOAD_TOO_LARGE,
  StatusCode,
  createErrorType,
} = require('./lib/cjs/index.js')

export {
  ING_BAD_REQUEST,
  ING_CONTENT_LENGTH_MISMATCH,
  ING_CONTENT_LENGTH_REQUIRED,
  ING_INPUT_FAILED_VALIDATION,
  ING_NO_SERIALIZER,
  ING_PAYLOAD_TOO_LARGE,
  StatusCode,
  createErrorType,
}
