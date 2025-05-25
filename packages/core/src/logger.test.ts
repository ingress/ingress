import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Logger } from './logger.js'

describe('Logger', () => {
  describe('console output methods', () => {
    it('should have all required logging methods', () => {
      const logger = new Logger()

      assert.strictEqual(typeof logger.log, 'function')
      assert.strictEqual(typeof logger.info, 'function')
      assert.strictEqual(typeof logger.error, 'function')
      assert.strictEqual(typeof logger.warn, 'function')
    })

    it('should call console.log for log method', () => {
      const logger = new Logger()
      let logCalled = false
      let logArgs: any[] = []

      const originalLog = console.log
      console.log = (...args: any[]) => {
        logCalled = true
        logArgs = args
      }

      try {
        logger.log('test message', 123, { key: 'value' })

        assert.strictEqual(logCalled, true)
        assert.deepStrictEqual(logArgs, ['test message', 123, { key: 'value' }])
      } finally {
        console.log = originalLog
      }
    })

    it('should call console.log for info method', () => {
      const logger = new Logger()
      let infoCalled = false
      let infoArgs: any[] = []

      const originalLog = console.log
      console.log = (...args: any[]) => {
        infoCalled = true
        infoArgs = args
      }

      try {
        logger.info('info message', { data: 'test' })

        assert.strictEqual(infoCalled, true)
        assert.deepStrictEqual(infoArgs, ['info message', { data: 'test' }])
      } finally {
        console.log = originalLog
      }
    })

    it('should call console.error for error method', () => {
      const logger = new Logger()
      let errorCalled = false
      let errorArgs: any[] = []

      const originalError = console.error
      console.error = (...args: any[]) => {
        errorCalled = true
        errorArgs = args
      }

      try {
        const testError = new Error('test error')
        logger.error('error occurred', testError)

        assert.strictEqual(errorCalled, true)
        assert.deepStrictEqual(errorArgs, ['error occurred', testError])
      } finally {
        console.error = originalError
      }
    })

    it('should call console.warn for warn method', () => {
      const logger = new Logger()
      let warnCalled = false
      let warnArgs: any[] = []

      const originalWarn = console.warn
      console.warn = (...args: any[]) => {
        warnCalled = true
        warnArgs = args
      }

      try {
        logger.warn('warning message', 'additional context')

        assert.strictEqual(warnCalled, true)
        assert.deepStrictEqual(warnArgs, ['warning message', 'additional context'])
      } finally {
        console.warn = originalWarn
      }
    })
  })

  describe('interface compliance', () => {
    it('should implement Logger interface correctly', () => {
      const logger = new Logger()

      // Should be able to call all methods without errors
      assert.doesNotThrow(() => logger.log())
      assert.doesNotThrow(() => logger.info())
      assert.doesNotThrow(() => logger.error())
      assert.doesNotThrow(() => logger.warn())
    })

    it('should handle multiple arguments', () => {
      const logger = new Logger()

      // Should not throw with various argument combinations
      assert.doesNotThrow(() => logger.log('message'))
      assert.doesNotThrow(() => logger.log('message', 'arg2'))
      assert.doesNotThrow(() => logger.log('message', 'arg2', 'arg3'))
      assert.doesNotThrow(() => logger.log())

      assert.doesNotThrow(() => logger.info('info', { object: true }, 123))
      assert.doesNotThrow(() => logger.error('error', new Error('test')))
      assert.doesNotThrow(() => logger.warn('warn', null, undefined))
    })

    it('should handle edge case arguments', () => {
      const logger = new Logger()

      // Should handle null, undefined, and various types
      assert.doesNotThrow(() => logger.log(null))
      assert.doesNotThrow(() => logger.log(undefined))
      assert.doesNotThrow(() => logger.log(0))
      assert.doesNotThrow(() => logger.log(false))
      assert.doesNotThrow(() => logger.log(''))
      assert.doesNotThrow(() => logger.log({}))
      assert.doesNotThrow(() => logger.log([]))
      assert.doesNotThrow(() => logger.log(Symbol('test')))
    })
  })
})
