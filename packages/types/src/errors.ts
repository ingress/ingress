import { createErrorType } from './error.js'
import { StatusCode } from './status-code.js'

export { createErrorType }

export const ING_UNHANDLED_INTERNAL_SERVER_ERROR = createErrorType(
  'IngUnhandledInternalServerError',
  {
    code: 'internal_server_error',
    message: 'Bad Request',
    statusCode: StatusCode.InternalServerError,
  },
)

export const ING_BAD_REQUEST = createErrorType('IngBadRequest', {
  code: 'bad_request',
  message: 'Bad Request',
  statusCode: StatusCode.BadRequest,
})

export const ING_NO_SERIALIZER = createErrorType('IngNoSerializer', {
  code: 'no_parser_found',
  message: 'No parser found for the specified Content-Type',
  statusCode: StatusCode.InternalServerError,
})

export const ING_CONTENT_LENGTH_MISMATCH = createErrorType('IngContentLengthMisMatch', {
  code: 'content_length_mismatch',
  message: 'Body did not have the expected Content-Length',
  statusCode: StatusCode.BadRequest,
})

export const ING_CONTENT_LENGTH_REQUIRED = createErrorType('IngContentLengthRequired', {
  code: 'content_length_required',
  message: 'Length Required',
  statusCode: StatusCode.LengthRequired,
})

export const ING_PAYLOAD_TOO_LARGE = createErrorType('IngPayloadTooLarge', {
  code: 'payload_too_large',
  message: 'Payload too large',
  statusCode: StatusCode.PayloadTooLarge,
})

export const ING_INPUT_FAILED_VALIDATION = createErrorType('IngInputFailedValidation', {
  code: 'validation_failed',
  message: 'Validation failed',
  statusCode: StatusCode.UnsupportedMediaType,
})
