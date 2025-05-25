import type { Middleware } from './core.js'
import { compose, exec } from './core.js'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { executeByArity } from './compose.js'

describe('compose', () => {
  describe('middleware execution', () => {
    it('should short circuit when middleware does not call next', async () => {
      const context = { count: 0 }

      await compose(
        async (ctx: any) => {
          ctx.count++
          // Not calling next() - should short circuit
        },
        async (ctx: any) => {
          ctx.count++
        },
      )(context)

      assert.strictEqual(context.count, 1, 'Should only execute first middleware')
    })

    it('should execute middleware in correct order with next() calls', async () => {
      let executionOrder = ''

      await compose(
        async (_ctx: any, next: any) => {
          executionOrder += '1'
          await next()
          executionOrder += '3'
        },
        async (_ctx: any, next: any) => {
          await next()
          executionOrder += '2'
        },
      )({})

      assert.strictEqual(executionOrder, '123', 'Should execute in onion-like pattern')
    })

    it('should support concurrent execution of composed middleware', async () => {
      let firstExecution = true
      const composedMiddleware = compose(async (_ctx: any, next: any) => {
        if (firstExecution) {
          firstExecution = false
          await new Promise((resolve) => setTimeout(resolve, 5))
        }
        await next()
      })

      // Should not throw or deadlock
      await Promise.all([composedMiddleware({}), composedMiddleware({})])
    })

    it('should work as valid middleware when passed to another compose', async () => {
      const context = { str: '' }
      const composedMiddleware = compose<typeof context>(
        async function (ctx, next) {
          ctx.str += '1'
          await next()
          ctx.str += '5'
        },
        async function (ctx, next) {
          ctx.str += '2'
          await next()
          ctx.str += '4'
        },
      )

      await composedMiddleware(context, (ctx, next) => {
        ctx.str += '3'
        return next()
      })

      assert.strictEqual(context.str, '12345', 'Should execute in correct nested order')
    })
  })

  describe('error handling', () => {
    it('should throw error for invalid middleware arguments', () => {
      assert.throws(() => compose('invalid' as any), TypeError, 'Should reject non-function middleware')
    })

    it('should propagate errors thrown in middleware', async () => {
      const expectedError = new Error('Test error')
      let errorWasCaught = false

      try {
        await compose(() => {
          throw expectedError
        })({})
      } catch (error) {
        errorWasCaught = true
        assert.strictEqual(error, expectedError, 'Should propagate the exact error')
      }

      assert.strictEqual(errorWasCaught, true, 'Error should have been caught')
    })
  })
})

describe('exec', () => {
  describe('dynamic middleware execution', () => {
    it('should execute middleware array with dynamic additions', async () => {
      const middlewares: Middleware<any>[] = [
        async (ctx, next) => {
          ctx.value += '1'
          await next()
          ctx.value += '6'
        },
        async (ctx, next) => {
          ctx.value += '2'
          // Dynamically add middleware during execution
          middlewares.push(async (ctx, next) => {
            ctx.value += '3'
            await next()
            ctx.value += '4'
          })
          await next()
          ctx.value += '5'
        },
      ]

      const context = { value: '' }
      const lastMiddleware = async (ctx: any, next: any) => {
        ctx.value += 'L'
        return next()
      }

      await exec(middlewares, context, lastMiddleware)
      assert.strictEqual(context.value, '123L456', 'Should handle dynamic middleware addition')
    })

    it('should handle middleware array modifications during execution', async () => {
      const middlewares: Middleware<any>[] = [
        async (ctx, next) => {
          ctx.value += '1'
          await next()
          ctx.value += '6'
        },
        async (ctx, next) => {
          middlewares.splice(1, 1, void 0 as any) // Remove self
          ctx.value += '2'
          await next()
          ctx.value += '5'
        },
        async (ctx, next) => {
          ctx.value += '3'
          await next()
          ctx.value += '4'
        },
        (ctx: any, next: any) => {
          ctx.value += 'L'
          return next()
        },
      ]

      const context = { value: '' }
      await exec(middlewares, context)

      assert.strictEqual(context.value, '123L456', 'Should handle middleware removal during execution')
    })
  })
})

describe('executeByArity', () => {
  describe('function execution based on parameter count', () => {
    it('should execute function and call next when function exists', async () => {
      let executionPlan = 0
      const usableObject = {
        testFunction() {
          executionPlan++
          return Promise.resolve()
        },
      }

      await executeByArity('testFunction', undefined, usableObject, {}, () => {
        executionPlan++
      })

      assert.strictEqual(executionPlan, 2, 'Should execute both function and next')
    })

    it('should only call next when function does not exist', async () => {
      let executionPlan = 0
      const usableObject = {
        someOtherFunction() {
          executionPlan++
          return Promise.resolve()
        },
      }

      await executeByArity('nonExistentFunction', undefined, usableObject, {}, () => {
        executionPlan++
      })

      assert.strictEqual(executionPlan, 1, 'Should only execute next when function missing')
    })
  })
})
