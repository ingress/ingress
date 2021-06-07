import { describe, it } from '@jest/globals'

import { once } from './lang'

describe('lang', () => {
  describe('once', () => {
    it('should only execute the given function once', () => {
      let counter = 0
      const one = once(function increment() {
        counter++
      })
      one()
      one()
      expect(counter).toBe(1)
    })

    it('should use the given function to execute after one execution', () => {
      let counter = 0
      const one = once(
        function increment() {
          counter++
        },
        () => {
          counter += 2
        }
      )
      one() // 1
      one() // 3
      one() // 5
      expect(counter).toBe(5)
    })
  })
})
