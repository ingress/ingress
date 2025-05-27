import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { Route, ingress } from 'ingress'
import type { Static, StaticDecode } from './index.js'
import { inject } from '@hapi/shot'
import { FormatRegistry, Type } from './index.js'
import { ING_BAD_REQUEST } from '@ingress/types'

describe('boundary types with typebox', () => {
  let app: ReturnType<typeof ingress>

  before(async () => {
    const RequiredString = Type.Required(Type.String())
    type Input = Static<typeof Input>
    const Input = Type.Boundary(Type.Object({ test: RequiredString }))

    type Decodable = StaticDecode<typeof Decodable>
    const Decodable = Type.Boundary(
      Type.Object({
        test: Type.Transform(
          Type.String({
            format: 'date-time',
          }),
        )
          .Decode((raw: string) => new Date(Date.parse(raw)))
          .Encode((raw: Date) => raw.toISOString()),
      }),
    )

    async function getSession(fauxId?: string) {
      return { userId: fauxId }
    }

    type CustomParse = Static<typeof CustomParse>
    const CustomParse = Type.Boundary(
      Type.Object({ userId: Type.String({ minLength: 1 }) }),
      async (raw, check) => {
        const token = raw ? String(raw).replace(/Bearer /i, '') : undefined,
          sessionResult = await getSession(token),
          passed = check.Check(sessionResult)
        if (passed) {
          return check.Decode(sessionResult)
        }
        throw new ING_BAD_REQUEST('Invalid session')
      },
    )
    type CustomPick = Static<typeof CustomParse>
    const CustomPick = Type.Boundary(
      Type.Object({ userId: Type.String({ minLength: 1 }) }),
      async (raw, check) => {
        const token = raw ? String(raw).replace(/Bearer /i, '') : undefined,
          sessionResult = await getSession(token),
          passed = check.Check(sessionResult)
        if (passed) {
          return check.Decode(sessionResult)
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
        '{"error":{"code":"bad_request","message":"Expected required property at /test"}}',
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
        '{"error":{"code":"bad_request","message":"Expected required property at /test"}}',
      )
    })

    it('should throw on unregistered formats requests', async () => {
      const result = await inject(app.driver, {
        url: '/decode-test?test=2021-01-01T00:00:00.000Z',
        method: 'GET',
      })
      assert.strictEqual(
        result.payload,
        `{"error":{"code":"bad_request","message":"Unknown format 'date-time' at /test"}}`,
      )
      assert.strictEqual(result.statusCode, 400)
    })
    it('should decode registered formats', async () => {
      //naive verbatim date-time
      FormatRegistry.Set('date-time', (raw) => new Date(raw).toISOString() === raw)

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
