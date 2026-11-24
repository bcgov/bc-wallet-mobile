import { BCSCEvent, BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState, initialState } from '@/store'
import { selectVerificationRequestCheck, selectVerificationState } from './selectors'
import { VerificationRequestCheckType } from './verification-request-check'

const buildState = (
  secure: Partial<BCState['bcscSecure']> = {},
  bcscReason?: BCSCReason,
  bcscEvent?: BCSCEvent
): BCState => ({
  ...initialState,
  bcsc: {
    ...initialState.bcsc,
    credentialMetadata: bcscReason || bcscEvent ? { bcscReason, bcscEvent } : undefined,
  } as BCState['bcsc'],
  bcscSecure: { ...initialState.bcscSecure, ...secure },
})

describe('selectVerificationState', () => {
  it('needs verification in the initial state', () => {
    expect(selectVerificationState(initialState)).toMatchObject({ isVerified: false, needsVerification: true })
  })

  it('reads the verified flag as the credential', () => {
    expect(selectVerificationState(buildState({ hasCredentialRecord: true }))).toMatchObject({
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

  it('reads the credentialDeactivated fact as an inactive card', () => {
    expect(selectVerificationState(buildState({ credentialDeactivated: true }))).toMatchObject({
      isCardInactive: true,
    })
  })

  it('reads the saved Expired by System reason as an inactive card while a token or record remains', () => {
    expect(selectVerificationState(buildState({ refreshToken: 'token' }, BCSCReason.ExpiredBySystem))).toMatchObject({
      isCardInactive: true,
    })
    expect(
      selectVerificationState(buildState({ hasCredentialRecord: true }, BCSCReason.ExpiredBySystem))
    ).toMatchObject({
      isCardInactive: true,
    })
  })

  it.each([BCSCEvent.Expire, BCSCEvent.Cancel])('reads the saved %s event as an inactive card', (event) => {
    expect(
      selectVerificationState(buildState({ hasCredentialRecord: true }, BCSCReason.ApprovedByAgent, event))
    ).toMatchObject({ isVerified: true, isCardInactive: true })
  })

  it('lets a saved event decide over the saved reason', () => {
    expect(
      selectVerificationState(buildState({ hasCredentialRecord: true }, BCSCReason.ExpiredBySystem, BCSCEvent.Renewal))
    ).toMatchObject({ isCardInactive: false })
  })

  it('ignores a saved Expired by System reason when no record or token remains (a reset registration)', () => {
    expect(selectVerificationState(buildState({}, BCSCReason.ExpiredBySystem))).toMatchObject({
      isCardInactive: false,
    })
  })

  it.each([BCSCReason.ApprovedByAgent, BCSCReason.Cancel, BCSCReason.CanceledByAgent])(
    'does not read the saved %s reason as an inactive card',
    (reason) => {
      expect(selectVerificationState(buildState({}, reason))).toMatchObject({ isCardInactive: false })
    }
  )

  it('keeps a credential record verified when the saved reason says the card expired', () => {
    expect(
      selectVerificationState(buildState({ hasCredentialRecord: true }, BCSCReason.ExpiredBySystem))
    ).toMatchObject({
      isVerified: true,
      isDeviceVerifiedByIas: true,
      isCardInactive: true,
    })
  })

  it('reads a stored refresh token as the device being verified by IAS', () => {
    expect(selectVerificationState(buildState({ refreshToken: 'token' }))).toMatchObject({
      isDeviceVerifiedByIas: true,
      isVerified: false,
    })
  })

  it.each([
    ['the record says deactivated', { credentialDeactivated: true }, undefined],
    ['the saved reason says expired', {}, BCSCReason.ExpiredBySystem],
  ])('does not treat a refresh token as device verified when %s', (_name, secure, reason) => {
    expect(selectVerificationState(buildState({ refreshToken: 'token', ...secure }, reason))).toMatchObject({
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
      selectVerificationRequestCheck(
        buildState({ hasCredentialRecord: true, verificationRequestId: 'req-1', ...deviceCodes })
      )
    ).toEqual({ type: VerificationRequestCheckType.None })
  })
})
