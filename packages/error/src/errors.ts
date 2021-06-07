import { createErrorType } from './error.js'
import { StatusCode } from '@ingress/http-status'

export const ING_BAD_REQUEST = createErrorType('IngBadRequest', {
  code: 'ING_BAD_REQUEST',
  message: 'Bad Request',
  statusCode: StatusCode.BadRequest,
})

export const ING_CONTENT_LENGTH_MISMATCH = createErrorType('IngContentLengthMisMatch', {
  code: 'ING_CONTENT_LENGTH_MISMATCH',
  message: 'Body did not have the expected Content-Length',
  statusCode: StatusCode.BadRequest,
})

export const ING_CONTENT_LENGTH_REQUIRED = createErrorType('IngContentLengthRequired', {
  code: 'ING_CONTENT_LENGTH_REQUIRED',
  message: 'Length Required',
  statusCode: StatusCode.LengthRequired,
})

export const ING_INPUT_FAILED_VALIDATION = createErrorType('IngInputFailedValidation', {
  code: 'ING_INPUT_FAILED_VALIDATION',
  message: 'Validation failed',
  statusCode: StatusCode.UnsupportedMediaType,
})
