import { BCState, initialState } from '@/store'
import { selectVerificationRequestCheck, selectVerificationState } from './selectors'
import { VerificationRequestCheckType } from './verification-request-check'

const buildState = (secure: Partial<BCState['bcscSecure']> = {}): BCState => ({
  ...initialState,
  bcscSecure: { ...initialState.bcscSecure, ...secure },
})

describe('selectVerificationState', () => {
  it('needs verification in the initial state', () => {
    expect(selectVerificationState(initialState)).toMatchObject({ isVerified: false, needsVerification: true })
  })

  it('reads the verified flag as the credential', () => {
    expect(selectVerificationState(buildState({ verified: true }))).toMatchObject({
      isVerified: true,
      needsVerification: false,
    })
  })

  it('reads the inVerifyFlow fact as being in the verify flow', () => {
    expect(selectVerificationState(buildState({ inVerifyFlow: true }))).toMatchObject({
      isVerificationInProgress: true,
      needsVerification: false,
    })
  })

  it('reads the credentialDeactivated fact as a deactivated credential', () => {
    expect(selectVerificationState(buildState({ credentialDeactivated: true }))).toMatchObject({
      isDeactivated: true,
    })
  })

  it('reads a stored refresh token as the device being verified by IAS', () => {
    expect(selectVerificationState(buildState({ refreshToken: 'token' }))).toMatchObject({
      isDeviceVerifiedByIas: true,
      isVerified: false,
    })
  })

  it('does not treat a refresh token as device verified once the credential is deactivated', () => {
    expect(selectVerificationState(buildState({ refreshToken: 'token', credentialDeactivated: true }))).toMatchObject({
      isDeviceVerifiedByIas: false,
    })
  })
})

describe('selectVerificationRequestCheck', () => {
  const deviceCodeExpiresAt = new Date('2026-11-26T00:00:00.000Z')
  const deviceCodes = { deviceCode: 'device', userCode: 'user', deviceCodeExpiresAt }

  it('has nothing to check in the initial state', () => {
    expect(selectVerificationRequestCheck(initialState)).toEqual({ type: VerificationRequestCheckType.None })
  })

  it('reads the stored request ID as the request to check the status of', () => {
    expect(selectVerificationRequestCheck(buildState({ verificationRequestId: 'req-1', ...deviceCodes }))).toEqual({
      type: VerificationRequestCheckType.RequestStatus,
      verificationRequestId: 'req-1',
    })
  })

  it('reads the stored device codes and their expiry as the pending verification to recover', () => {
    expect(selectVerificationRequestCheck(buildState(deviceCodes))).toEqual({
      type: VerificationRequestCheckType.PendingRecovery,
      ...deviceCodes,
    })
  })

  it('reads the verified flag, which leaves nothing to check', () => {
    expect(
      selectVerificationRequestCheck(buildState({ verified: true, verificationRequestId: 'req-1', ...deviceCodes }))
    ).toEqual({ type: VerificationRequestCheckType.None })
  })
})
