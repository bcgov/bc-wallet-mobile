import { AppEventCode } from '@/events/appEventCode'
import {
  parseApiResponse,
  registrationResponseSchema,
  tokenResponseSchema,
  userInfoResponseSchema,
} from './response-schemas'

const createMockLogger = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) as any

const validToken = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  id_token: 'id-token',
  expires_in: 3600,
  scope: 'openid',
  token_type: 'Bearer',
  sub: 'unread-passthrough-field',
}

const validRegistration = {
  client_id: 'client-id',
  registration_access_token: 'reg-token',
  registration_client_uri: 'https://example.com/registration/client-id',
  jwks: { keys: [{ n: 'modulus', kty: 'RSA', e: 'AQAB', kid: 'kid', alg: 'RS256' }] },
  future_field: 'unread-passthrough-field',
}

const validUserInfo = {
  card_expiry: '2030-01-01',
  given_names: 'Steve John',
  family_name: 'Brule',
  birthdate: '1980-01-01',
  email: 'steve@example.com',
  address: { formatted: '123 Main St' },
  picture: 'https://example.com/pic.jpg',
  card_type: 'BCSC',
  sub: 'unread-passthrough-field',
  credential_reference: 'unread-passthrough-field',
}

describe('response-schemas', () => {
  describe('valid data', () => {
    it('accepts a full token fixture and passes unknown keys through', () => {
      const logger = createMockLogger()
      const result = parseApiResponse(tokenResponseSchema, validToken, 'token', logger)

      expect(result).toMatchObject(validToken)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('accepts a full registration fixture and passes unknown keys through', () => {
      const logger = createMockLogger()
      const result = parseApiResponse(registrationResponseSchema, validRegistration, 'registration', logger)

      expect(result).toMatchObject(validRegistration)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('accepts a full user-info fixture and passes unknown keys through', () => {
      const logger = createMockLogger()
      const result = parseApiResponse(userInfoResponseSchema, validUserInfo, 'userinfo', logger)

      expect(result).toMatchObject(validUserInfo)
      expect(logger.error).not.toHaveBeenCalled()
    })
  })

  describe('optional absence', () => {
    it('resolves a token with only the three required fields', () => {
      const logger = createMockLogger()
      const result = parseApiResponse(
        tokenResponseSchema,
        { access_token: 'a', refresh_token: 'r', id_token: 'i' },
        'token',
        logger
      )

      expect(result).toEqual({ access_token: 'a', refresh_token: 'r', id_token: 'i' })
    })

    it('resolves a registration response with no jwks', () => {
      const logger = createMockLogger()
      const result = parseApiResponse(
        registrationResponseSchema,
        { client_id: 'c', registration_access_token: 'r' },
        'registration',
        logger
      )

      expect(result).toEqual({ client_id: 'c', registration_access_token: 'r' })
    })

    it('resolves a user-info response with only card_expiry', () => {
      const logger = createMockLogger()
      const result = parseApiResponse(userInfoResponseSchema, { card_expiry: '2030-01-01' }, 'userinfo', logger)

      expect(result).toEqual({ card_expiry: '2030-01-01' })
    })
  })

  describe('missing or wrong-typed required fields', () => {
    it('rejects a token missing id_token', () => {
      const logger = createMockLogger()
      const { access_token, refresh_token } = validToken
      expect(() =>
        parseApiResponse(tokenResponseSchema, { access_token, refresh_token }, 'token', logger)
      ).toThrow(expect.objectContaining({ appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE }))
    })

    it('rejects a registration response missing registration_access_token', () => {
      const logger = createMockLogger()
      expect(() =>
        parseApiResponse(registrationResponseSchema, { client_id: 'c' }, 'registration', logger)
      ).toThrow(expect.objectContaining({ appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE }))
    })

    it('rejects a user-info response missing card_expiry', () => {
      const logger = createMockLogger()
      expect(() => parseApiResponse(userInfoResponseSchema, { given_names: 'Steve' }, 'userinfo', logger)).toThrow(
        expect.objectContaining({ appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE })
      )
    })

    it('rejects a user-info response with a wrong-typed nested field', () => {
      const logger = createMockLogger()
      let error: unknown
      try {
        parseApiResponse(userInfoResponseSchema, { card_expiry: '2030-01-01', address: 'not-an-object' }, 'userinfo', logger)
      } catch (e) {
        error = e
      }

      expect(error).toMatchObject({
        appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE,
        context: { issues: [{ path: 'address', code: 'invalid_type' }] },
      })
    })
  })

  describe('body not an object', () => {
    it.each([null, 'x', []])('rejects %p with path ""', (value) => {
      const logger = createMockLogger()
      let error: unknown
      try {
        parseApiResponse(tokenResponseSchema, value, 'token', logger)
      } catch (e) {
        error = e
      }

      expect(error).toMatchObject({ appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE })
      expect((error as any).context.issues[0].path).toBe('')
    })
  })

  describe('redaction', () => {
    it('never logs or attaches received values or issue.message', () => {
      const logger = createMockLogger()
      const body = { card_expiry: 42, email: 'leak@example.com' }

      let error: unknown
      try {
        parseApiResponse(userInfoResponseSchema, body, 'userinfo', logger)
      } catch (e) {
        error = e
      }

      expect(logger.error).toHaveBeenCalledTimes(1)
      const [, loggedData] = logger.error.mock.calls[0]
      const loggedJson = JSON.stringify(loggedData)
      expect(loggedJson).not.toContain('42')
      expect(loggedJson).not.toContain('leak@')
      expect(loggedJson).not.toContain('message')
      expect(loggedData).toEqual({ endpoint: 'userinfo', issues: [{ path: 'card_expiry', code: 'invalid_type' }] })

      const context = (error as any).context
      const contextJson = JSON.stringify(context)
      expect(contextJson).not.toContain('42')
      expect(contextJson).not.toContain('leak@')
      expect(contextJson).not.toContain('message')
    })
  })
})
