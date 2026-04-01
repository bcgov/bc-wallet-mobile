import { getAttestationErrorLogContext } from './attestation'

describe('getAttestationErrorLogContext', () => {
  it('extracts fields from a native attestation error', () => {
    const error = Object.assign(new Error('Cloud project number is invalid.'), {
      code: '-16',
      nativeStackAndroid: [{ methodName: 'foo', lineNumber: 1 }],
      userInfo: { key: 'value' },
    })

    const context = getAttestationErrorLogContext(error)

    expect(context).toEqual({
      errorName: 'Error',
      errorMessage: 'Cloud project number is invalid.',
      errorCode: '-16',
      nativeStackAndroid: [{ methodName: 'foo', lineNumber: 1 }],
      userInfo: { key: 'value' },
      stack: expect.any(String),
    })
  })

  it('extracts fields from an iOS receipt_missing error', () => {
    const error = Object.assign(new Error('No App Store receipt is available.'), {
      code: 'receipt_missing',
    })

    const context = getAttestationErrorLogContext(error)

    expect(context).toEqual({
      errorName: 'Error',
      errorMessage: 'No App Store receipt is available.',
      errorCode: 'receipt_missing',
      nativeStackAndroid: undefined,
      userInfo: undefined,
      stack: expect.any(String),
    })
  })

  it('handles a plain Error without native extensions', () => {
    const error = new Error('something broke')

    const context = getAttestationErrorLogContext(error)

    expect(context).toEqual({
      errorName: 'Error',
      errorMessage: 'something broke',
      errorCode: undefined,
      nativeStackAndroid: undefined,
      userInfo: undefined,
      stack: expect.any(String),
    })
  })

  it('handles a non-Error value (string)', () => {
    const context = getAttestationErrorLogContext('unexpected string error')

    expect(context).toEqual({
      errorMessage: 'unexpected string error',
    })
  })

  it('handles a non-Error value (number)', () => {
    const context = getAttestationErrorLogContext(42)

    expect(context).toEqual({
      errorMessage: '42',
    })
  })

  it('handles null', () => {
    const context = getAttestationErrorLogContext(null)

    expect(context).toEqual({
      errorMessage: 'null',
    })
  })
})
