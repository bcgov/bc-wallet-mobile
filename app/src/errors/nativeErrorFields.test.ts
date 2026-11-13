import { AxiosError } from 'axios'
import { AppError } from './appError'
import { ErrorRegistry } from './errorRegistry'
import { getNativeErrorFields } from './nativeErrorFields'

// Shaped like a React Native native-module rejection: a string code plus userInfo
const nativeRejection = (code: string, userInfo: unknown) =>
  Object.assign(new Error('Failed to sign the pairing code.'), { code, userInfo })

const wrap = (cause: unknown) => AppError.fromErrorDefinition(ErrorRegistry.LOGIN_DEVICE_ERROR, { cause, track: false })

describe('getNativeErrorFields', () => {
  it('reads the code and allow-listed userInfo of a native rejection that is the direct cause', () => {
    const error = wrap(
      nativeRejection('E_KEYPAIR_RETRIEVAL_FAILED', {
        site: 'createQuickLoginJWT.get_key',
        detail: 'NSOSStatusErrorDomain:-25308',
        osStatus: -25308,
      })
    )

    expect(getNativeErrorFields(error)).toEqual({
      native_code: 'E_KEYPAIR_RETRIEVAL_FAILED',
      native_site: 'createQuickLoginJWT.get_key',
      native_detail: 'NSOSStatusErrorDomain:-25308',
      native_os_status: -25308,
    })
  })

  it('finds a native rejection beneath a mapped AppError, as in pairing', () => {
    const mapped = AppError.fromErrorDefinition(ErrorRegistry.SIGN_CLAIMS_ERROR, {
      cause: nativeRejection('E_JWT_SIGN_FAILED', { site: 'signPairingCode.sign' }),
      track: false,
    })

    expect(getNativeErrorFields(wrap(wrap(mapped)))).toEqual({
      native_code: 'E_JWT_SIGN_FAILED',
      native_site: 'signPairingCode.sign',
    })
  })

  it('leaves out userInfo keys that are not allow-listed, and non-scalar values', () => {
    const error = wrap(
      nativeRejection('E_KEYPAIR_RETRIEVAL_FAILED', {
        site: 'signPairingCode.get_key',
        detail: { nested: true },
        keyCreated: ['2026-01-01T00:00:00Z'],
        keyCount: 2,
      })
    )

    expect(getNativeErrorFields(error)).toEqual({
      native_code: 'E_KEYPAIR_RETRIEVAL_FAILED',
      native_site: 'signPairingCode.get_key',
    })
  })

  it('reports only the code when userInfo is null, as Android sends for a reject without one', () => {
    expect(getNativeErrorFields(wrap(nativeRejection('E_NO_KEYS_FOUND', null)))).toEqual({
      native_code: 'E_NO_KEYS_FOUND',
    })
  })

  it('recognizes a rejection by its native stack when userInfo is absent', () => {
    const rejection = Object.assign(new Error('No keys'), { code: 'E_NO_KEYS_FOUND', nativeStackIOS: [] })

    expect(getNativeErrorFields(wrap(rejection))).toEqual({ native_code: 'E_NO_KEYS_FOUND' })
  })

  it('ignores an Axios error, which also has a string code', () => {
    const error = wrap(new AxiosError('Network Error', 'ERR_NETWORK'))

    expect(getNativeErrorFields(error)).toEqual({})
  })

  it('ignores a plain error with a code but no native markers', () => {
    const error = wrap(Object.assign(new Error('nope'), { code: 'E_SOMETHING' }))

    expect(getNativeErrorFields(error)).toEqual({})
  })

  it('returns nothing when there is no cause', () => {
    expect(getNativeErrorFields(wrap(undefined))).toEqual({})
  })

  it('stops searching past the depth cap', () => {
    let error = wrap(nativeRejection('E_DEEP', { site: 'deep.site' }))
    for (let i = 0; i < 10; i++) {
      error = wrap(error)
    }

    expect(getNativeErrorFields(error)).toEqual({})
  })
})
