import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState, initialState } from '@/store'
import { selectVerificationState } from './selectors'

const buildState = (secure: Partial<BCState['bcscSecure']> = {}, bcscReason?: BCSCReason): BCState => ({
  ...initialState,
  bcsc: { ...initialState.bcsc, credentialMetadata: bcscReason ? { bcscReason } : undefined } as BCState['bcsc'],
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

  it('reads the credentialDeactivated fact as an inactive card', () => {
    expect(selectVerificationState(buildState({ credentialDeactivated: true }))).toMatchObject({
      isCardInactive: true,
    })
  })

  it('reads the saved Expired by System reason as an inactive card while a token or record remains', () => {
    expect(selectVerificationState(buildState({ refreshToken: 'token' }, BCSCReason.ExpiredBySystem))).toMatchObject({
      isCardInactive: true,
    })
    expect(selectVerificationState(buildState({ verified: true }, BCSCReason.ExpiredBySystem))).toMatchObject({
      isCardInactive: true,
    })
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
    expect(selectVerificationState(buildState({ verified: true }, BCSCReason.ExpiredBySystem))).toMatchObject({
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
