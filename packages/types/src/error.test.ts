import { describe, it, expect } from 'vitest'
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

    expect(MyError.name, 'Constructor has name').toBe('MyError')
    expect(myError.name, 'Instance has name').toBe('MyError')
    expect(myError.random, 'Extraneous typed properties').toBe('asdf')
    expect(myError.code, 'Code is set').toBe('SOMETHING')
    expect((MyError as any).code, 'Constructor code is not set').toBe(undefined)
    expect(myError instanceof Error, 'Is instanceof Error').toBeTruthy()
    expect(noNew instanceof Error, 'Not new-ing produces instance').toBeTruthy()
    expect(noNew).toEqual(myError)
    expect(myError.message, 'Sets default message').toBe('default message')
    expect(myErrorMessage.message, 'Overrides message').toBe('Some Message')
  })
})
