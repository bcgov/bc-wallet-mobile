import {
  getVerificationRequestCheck,
  VerificationRequestCheck,
  VerificationRequestCheckFacts,
  VerificationRequestCheckType,
} from './verification-request-check'

const EXPIRES_AT = new Date('2026-11-26T00:00:00.000Z')

const unverified: VerificationRequestCheckFacts = { isVerified: false }
const deviceCodes = { deviceCode: 'device', userCode: 'user', deviceCodeExpiresAt: EXPIRES_AT }

const none: VerificationRequestCheck = { type: VerificationRequestCheckType.None }
const requestStatus = (verificationRequestId: string): VerificationRequestCheck => ({
  type: VerificationRequestCheckType.RequestStatus,
  verificationRequestId,
})
const pendingRecovery = (deviceCodeExpiresAt?: Date): VerificationRequestCheck => ({
  type: VerificationRequestCheckType.PendingRecovery,
  deviceCode: 'device',
  userCode: 'user',
  deviceCodeExpiresAt,
})

describe('getVerificationRequestCheck', () => {
  it.each<[string, Partial<VerificationRequestCheckFacts>, VerificationRequestCheck]>([
    ['nothing submitted and no device codes', {}, none],
    ['a submitted request', { verificationRequestId: 'req-1' }, requestStatus('req-1')],
    ['device codes and no submitted request', deviceCodes, pendingRecovery(EXPIRES_AT)],
    ['device codes with no recorded expiry', { deviceCode: 'device', userCode: 'user' }, pendingRecovery()],
    [
      'a submitted request and the device codes it was made with, where the request wins',
      { verificationRequestId: 'req-1', ...deviceCodes },
      requestStatus('req-1'),
    ],
    ['a device code without its user code', { deviceCode: 'device' }, none],
    ['a user code without its device code', { userCode: 'user' }, none],
    // The reducers clear the codes to empty strings
    ['cleared values', { verificationRequestId: '', deviceCode: '', userCode: '' }, none],
    ['a verified user who still holds a request', { isVerified: true, verificationRequestId: 'req-1' }, none],
    ['a verified user who still holds device codes', { isVerified: true, ...deviceCodes }, none],
  ])('with %s', (_name, facts, expected) => {
    expect(getVerificationRequestCheck({ ...unverified, ...facts })).toEqual(expected)
  })
})
