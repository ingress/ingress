import * as t from 'uvu/assert'
import { test } from 'uvu'
import { createErrorType } from './error.js'

test('createErrorType', () => {
  const MyError = createErrorType('MyError', {
      code: 'SOMETHING',
      random: 'asdf',
      message: 'default message',
    }),
    myError = new MyError(),
    myErrorMessage = new MyError('Some Message'),
    noNew = (MyError as any)()

  t.is(MyError.name, 'MyError', 'Constructor has name')
  t.is(myError.name, 'MyError', 'Instance has name')
  t.is(myError.random, 'asdf', 'Extraneous typed properties')
  t.is(myError.code, 'SOMETHING', 'Code is set')
  t.is((MyError as any).code, undefined, 'Constructor code is not set')
  t.ok(myError instanceof Error, 'Is instanceof Error')
  t.ok(noNew instanceof Error, 'Not new-ing produces instance')
  t.equal(noNew, myError)
  t.is(myError.message, 'default message', 'Sets default message')
  t.is(myErrorMessage.message, 'Some Message', 'Overrides message')
})

test.run()
