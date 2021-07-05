import t from 'tap'
import { createErrorType } from './error.js'

t.test('createErrorType', (t) => {
  const MyError = createErrorType('MyError', {
      code: 'SOMETHING',
      random: 'asdf',
      message: 'default message',
    }),
    myError = new MyError(),
    myErrorMessage = new MyError('Some Message'),
    noNew = (MyError as any)()

  t.equal(MyError.name, 'MyError', 'Constructor has name')
  t.equal(myError.name, 'MyError', 'Instance has name')
  t.equal(myError.random, 'asdf', 'Extraneous typed properties')
  t.equal(myError.code, 'SOMETHING', 'Code is set')
  t.equal((MyError as any).code, undefined, 'Constructor code is not set')
  t.ok(myError instanceof Error, 'Is instanceof Error')
  t.ok(noNew instanceof Error, 'Not new-ing produces instance')
  t.same(noNew, myError)
  t.equal(myError.message, 'default message', 'Sets default message')
  t.equal(myErrorMessage.message, 'Some Message', 'Overrides message')

  t.end()
})
