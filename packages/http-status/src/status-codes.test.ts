import { test } from 'uvu'
import * as t from 'uvu/assert'
import { StatusCode } from './status-codes.js'

test('smoke', () => {
  t.is(StatusCode.BadRequest, 400)
  t.is(StatusCode.Ok, 200)
  t.equal(Object.keys(StatusCode.Empty).map(Number), [
    StatusCode.NoContent,
    StatusCode.ResetContent,
    StatusCode.NotModified,
  ])
})

test.run()
