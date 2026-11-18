import { BCState, initialState } from '@/store'
import { selectVerificationState } from './selectors'

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
