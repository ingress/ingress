import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createErrorType } from './error.js'

describe('createErrorType', () => {
  it('createErrorType', () => {
    const MyError = createErrorType('MyError', {
        code: 'SOMETHING',
        random: 'asdf',
        message: 'default message',
      }),
      myError = new MyError(),
      myErrorMessage = new MyError('Some Message'),
      noNew = (MyError as any)()

    assert.equal(MyError.name, 'MyError', 'Constructor has name')
    assert.equal(myError.name, 'MyError', 'Instance has name')
    assert.equal(myError.random, 'asdf', 'Extraneous typed properties')
    assert.equal(myError.code, 'SOMETHING', 'Code is set')
    assert.equal((MyError as any).code, undefined, 'Constructor code is not set')
    assert.ok(myError instanceof Error, 'Is instanceof Error')
    assert.ok(noNew instanceof Error, 'Not new-ing produces instance')
    assert.deepStrictEqual(noNew, myError)
    assert.equal(myError.message, 'default message', 'Sets default message')
    assert.equal(myErrorMessage.message, 'Some Message', 'Overrides message')
  })
})
