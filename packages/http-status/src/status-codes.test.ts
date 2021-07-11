import t from 'tap'
import { StatusCode } from './status-codes.js'

//smoke
t.equal(StatusCode.BadRequest, 400)
t.equal(StatusCode.Ok, 200)
t.same(Object.keys(StatusCode.Empty), [
  StatusCode.NoContent,
  StatusCode.ResetContent,
  StatusCode.NotModified,
])
