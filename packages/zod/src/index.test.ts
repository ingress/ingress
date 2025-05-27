import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { Route, ingress } from 'ingress'
import { inject } from '@hapi/shot'
import { z, boundary } from './index.js'
import { ING_BAD_REQUEST } from '@ingress/types'

describe('boundary types with zod', () => {
  let app: ReturnType<typeof ingress>

  before(async () => {
    type Input = z.infer<typeof InputSchema>
    const InputSchema = z.object({ test: z.string().min(1) })
    const Input = boundary(InputSchema)

    type Decodable = z.infer<typeof DecodableSchema>
    const DecodableSchema = z.object({
      test: z.string().transform((val: string) => new Date(val)),
    })
    const Decodable = boundary(DecodableSchema)

    async function getSession(fauxId?: string) {
      return { userId: fauxId }
    }

    type CustomParse = z.infer<typeof CustomParseSchema>
    const CustomParseSchema = z.object({ userId: z.string().min(1) })
    const CustomParse = boundary(CustomParseSchema, async (raw: unknown, schema: any) => {
      const token = raw ? String(raw).replace(/Bearer /i, '') : undefined,
        sessionResult = await getSession(token),
        result = schema.safeParse(sessionResult)
      if (result.success) {
        return result.data
      }
      throw new ING_BAD_REQUEST('Invalid session')
    })

    type CustomPick = z.infer<typeof CustomPickSchema>
    const CustomPickSchema = z.object({ userId: z.string().min(1) })
    const CustomPick = boundary(
      CustomPickSchema,
      async (raw: unknown, schema: any) => {
        const token = raw ? String(raw).replace(/Bearer /i, '') : undefined,
          sessionResult = await getSession(token),
          result = schema.safeParse(sessionResult)
        if (result.success) {
          return result.data
        }
        throw new ING_BAD_REQUEST('Invalid session')
      },
      Route.Header('authorization'),
    )

    class Routes {
      @Route.Get('/query-object')
      test(@Route.Query() input: Input) {
        assert.strictEqual(input.test, '123')
        return input
      }

      @Route.Get('/decode-test')
      testDecode(@Route.Query() input: Decodable) {
        assert.strictEqual(input.test instanceof Date, true)
        return input
      }

      @Route.Get('/custom-parse')
      customParse(@Route.Header('authorization') input: CustomParse) {
        assert.strictEqual(input.userId, '123')
        return input
      }

      @Route.Get('/custom-parse-with-pick')
      customPick(input: CustomPick) {
        assert.strictEqual(input.userId, '123')
        return input
      }
    }

    app = ingress(Routes)
    await app.start()
  })

  describe('query object', () => {
    it('should catch invalid requests', async () => {
      const result = await inject(app.driver, {
        url: '/query-object',
        method: 'GET',
      })
      assert.strictEqual(result.statusCode, 400)
      assert.strictEqual(result.statusMessage, 'Bad Request')
      assert.strictEqual(result.headers['content-type'], 'application/json')
      assert.strictEqual(
        result.payload,
        '{"error":{"code":"bad_request","message":"Invalid input: expected string, received undefined at /test"}}',
      )
    })

    it('should check valid requests', async () => {
      const result = await inject(app.driver, {
        url: '/query-object?test=123',
        method: 'GET',
      })
      assert.strictEqual(result.statusCode, 200)
    })
  })

  describe('query object with decode', () => {
    it('should catch invalid requests', async () => {
      const result = await inject(app.driver, {
        url: '/decode-test',
        method: 'GET',
      })
      assert.strictEqual(result.statusCode, 400)
      assert.strictEqual(result.statusMessage, 'Bad Request')
      assert.strictEqual(result.headers['content-type'], 'application/json')
      assert.strictEqual(
        result.payload,
        '{"error":{"code":"bad_request","message":"Invalid input: expected string, received undefined at /test"}}',
      )
    })

    it('should decode valid date strings', async () => {
      const result = await inject(app.driver, {
        url: '/decode-test?test=2021-01-01T00:00:00.000Z',
        method: 'GET',
      })
      assert.strictEqual(result.payload, `{"test":"2021-01-01T00:00:00.000Z"}`)
      assert.strictEqual(result.statusCode, 200)
    })
  })

  describe('custom parse', () => {
    it('should catch invalid requests', async () => {
      const result = await inject(app.driver, {
        url: '/custom-parse',
        method: 'GET',
      })
      assert.strictEqual(result.statusCode, 400)
      assert.strictEqual(result.statusMessage, 'Bad Request')
      assert.strictEqual(result.headers['content-type'], 'application/json')
      assert.strictEqual(result.payload, '{"error":{"code":"bad_request","message":"Invalid session"}}')
    })

    it('should check valid requests', async () => {
      const result = await inject(app.driver, {
        url: '/custom-parse',
        method: 'GET',
        headers: {
          authorization: 'Bearer 123',
        },
      })
      assert.strictEqual(result.statusCode, 200)
      assert.strictEqual(result.statusMessage, 'OK')
      assert.strictEqual(result.headers['content-type'], 'application/json')
      assert.strictEqual(result.payload, `{"userId":"123"}`)
    })
  })

  describe('custom pick', () => {
    it('should catch invalid requests', async () => {
      const result = await inject(app.driver, {
        url: '/custom-parse-with-pick',
        method: 'GET',
      })
      assert.strictEqual(result.statusCode, 400)
      assert.strictEqual(result.statusMessage, 'Bad Request')
      assert.strictEqual(result.headers['content-type'], 'application/json')
      assert.strictEqual(result.payload, '{"error":{"code":"bad_request","message":"Invalid session"}}')
    })

    it('should check valid requests', async () => {
      const result = await inject(app.driver, {
        url: '/custom-parse-with-pick',
        method: 'GET',
        headers: {
          authorization: 'Bearer 123',
        },
      })
      assert.strictEqual(result.statusCode, 200)
      assert.strictEqual(result.statusMessage, 'OK')
      assert.strictEqual(result.headers['content-type'], 'application/json')
      assert.strictEqual(result.payload, `{"userId":"123"}`)
    })
  })
})
