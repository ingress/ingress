import { describe, it } from 'node:test'
import assert from 'node:assert'
import { isTestEnv } from './util.js'

describe('Utility Functions', () => {
  describe('isTestEnv', () => {
    it('should return true when NODE_ENV is test', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'test'
        assert.strictEqual(isTestEnv(), true)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return false when NODE_ENV is development', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'development'
        assert.strictEqual(isTestEnv(), false)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return false when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'production'
        assert.strictEqual(isTestEnv(), false)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return false when NODE_ENV is undefined', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        delete process.env.NODE_ENV
        assert.strictEqual(isTestEnv(), false)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return false when NODE_ENV is empty string', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = ''
        assert.strictEqual(isTestEnv(), false)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should return false for other NODE_ENV values', () => {
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'staging'
        assert.strictEqual(isTestEnv(), false)

        process.env.NODE_ENV = 'local'
        assert.strictEqual(isTestEnv(), false)

        process.env.NODE_ENV = 'custom'
        assert.strictEqual(isTestEnv(), false)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })
})
