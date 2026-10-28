import {
  confirmRegistrationClientId,
  getRegistrationTokenClientId,
  isUnusableClientIdError,
} from './registration-token'

const b64url = (value: object | string) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')
const makeToken = (payload: object) => `${b64url({ alg: 'RS256' })}.${b64url(payload)}.sig`

describe('getRegistrationTokenClientId', () => {
  it('returns aud when it is a string', () => {
    expect(getRegistrationTokenClientId(makeToken({ aud: 'client-a' }))).toBe('client-a')
  })

  it('returns aud when it is a one-element array', () => {
    expect(getRegistrationTokenClientId(makeToken({ aud: ['client-a'] }))).toBe('client-a')
  })

  it.each([
    ['multi-value array', { aud: ['a', 'b'] }],
    ['empty array', { aud: [] }],
    ['empty string', { aud: '' }],
    ['empty string in array', { aud: [''] }],
    ['non-string', { aud: 123 }],
    ['non-string in array', { aud: [123] }],
    ['missing aud', { iss: 'issuer' }],
  ])('returns undefined for %s', (_label, payload) => {
    expect(getRegistrationTokenClientId(makeToken(payload))).toBeUndefined()
  })

  it('returns undefined for a non-JWT string and for undefined', () => {
    expect(getRegistrationTokenClientId('not-a-jwt')).toBeUndefined()
    expect(getRegistrationTokenClientId(undefined)).toBeUndefined()
    expect(getRegistrationTokenClientId('')).toBeUndefined()
  })

  it('does not treat a token without exp as expired', () => {
    expect(getRegistrationTokenClientId(makeToken({ aud: 'client-a', iat: 1 }))).toBe('client-a')
  })
})

describe('confirmRegistrationClientId', () => {
  const makeClient = (impl: () => Promise<unknown>) => {
    const get = jest.fn(impl)
    return { get, endpoints: { registration: 'https://idp/device/register' } } as any
  }

  it('GETs the registration with the bearer token, no global error handling and a timeout', async () => {
    const apiClient = makeClient(async () => ({ data: { client_id: 'client-a' } }))

    await confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')

    expect(apiClient.get).toHaveBeenCalledWith('https://idp/device/register/client-a', {
      skipBearerAuth: true,
      skipOnErrorHandler: true,
      headers: { Authorization: 'Bearer reg-token' },
      timeout: 5000,
    })
  })

  it('returns confirmed when the response client_id matches', async () => {
    const apiClient = makeClient(async () => ({ data: { client_id: 'client-a' } }))

    await expect(confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')).resolves.toEqual({
      status: 'confirmed',
      newRegistrationAccessToken: undefined,
    })
  })

  it('returns confirmed with a rotated token', async () => {
    const apiClient = makeClient(async () => ({
      data: { client_id: 'client-a', registration_access_token: 'rotated' },
    }))

    await expect(confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')).resolves.toEqual({
      status: 'confirmed',
      newRegistrationAccessToken: 'rotated',
    })
  })

  it('returns client_id_mismatch with a rotated token when the response client_id differs', async () => {
    const apiClient = makeClient(async () => ({
      data: { client_id: 'client-b', registration_access_token: 'rotated' },
    }))

    await expect(confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')).resolves.toEqual({
      status: 'client_id_mismatch',
      newRegistrationAccessToken: 'rotated',
    })
  })

  it.each([[''], [123], [null]])('omits a malformed rotated token (%p)', async (rotated) => {
    const apiClient = makeClient(async () => ({ data: { client_id: 'client-a', registration_access_token: rotated } }))

    const result = await confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')

    expect(result).toMatchObject({ status: 'confirmed' })
    expect((result as { newRegistrationAccessToken?: string }).newRegistrationAccessToken).toBeUndefined()
  })

  it('returns client_id_mismatch for an empty body', async () => {
    const apiClient = makeClient(async () => ({ data: undefined }))

    await expect(confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')).resolves.toMatchObject({
      status: 'client_id_mismatch',
    })
  })

  it('returns request_failed with the http status from an AppError', async () => {
    const apiClient = makeClient(async () => {
      throw Object.assign(new Error('forbidden'), { context: { http_status: 403 } })
    })

    await expect(confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')).resolves.toEqual({
      status: 'request_failed',
      httpStatus: 403,
    })
  })

  it('returns request_failed without a status for a timeout', async () => {
    const apiClient = makeClient(async () => {
      throw Object.assign(new Error('timeout of 5000ms exceeded'), { code: 'ECONNABORTED' })
    })

    await expect(confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')).resolves.toEqual({
      status: 'request_failed',
      httpStatus: undefined,
    })
  })

  it('returns request_failed without a status for a network error and never rejects', async () => {
    const apiClient = makeClient(async () => {
      throw new Error('Network Error')
    })

    await expect(confirmRegistrationClientId(apiClient, 'client-a', 'reg-token')).resolves.toEqual({
      status: 'request_failed',
      httpStatus: undefined,
    })
  })
})

describe('isUnusableClientIdError', () => {
  const unauthorized = (technicalMessage: unknown) => ({ technicalMessage, context: { http_status: 401 } })

  it.each([
    'Could not find client: b5a1c3d2-7e44-4f0a-9d21-3c8a6f1e5b70',
    'Client does not own the presented refresh token',
  ])('accepts %s', (technicalMessage) => {
    expect(isUnusableClientIdError(unauthorized(technicalMessage))).toBe(true)
  })

  it.each([
    'Signature did not validate for presented JWT authentication.',
    'Assertion Token is expired: Tue Jan 01 00:00:00 GMT 2030',
    'Assertion Token was issued in the future: Tue Jan 01 00:00:00 GMT 2030',
    'Unknown: Could not find client',
    '',
  ])('rejects %s', (technicalMessage) => {
    expect(isUnusableClientIdError(unauthorized(technicalMessage))).toBe(false)
  })

  it.each([403, 400, undefined])('rejects a matching message with HTTP status %p', (httpStatus) => {
    const error = { technicalMessage: 'Could not find client: x', context: { http_status: httpStatus } }
    expect(isUnusableClientIdError(error)).toBe(false)
  })

  it.each([null, undefined, 'Could not find client', unauthorized(null), unauthorized(401)])(
    'rejects a non-string technicalMessage (%p)',
    (error) => {
      expect(isUnusableClientIdError(error)).toBe(false)
    }
  )
})
