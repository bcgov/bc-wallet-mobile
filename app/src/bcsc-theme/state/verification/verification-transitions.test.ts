import { HomeNoticeType } from '@/bcsc-theme/state/home/home-notice'
import { selectHomeNotice } from '@/bcsc-theme/state/home/selectors'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { UNEXPIRED_JWT } from '@/bcsc-theme/utils/__fixtures__/jwt'
import { isCredentialDeactivated } from '@/bcsc-theme/utils/bcsc-credential'
import { BCSCEvent, BCSCReason } from '@/bcsc-theme/utils/id-token'
import { getResumeStepRoute, ResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { BCDispatchAction, BCState, initialState, reducer } from '@/store'
import { CredentialInfo } from 'react-native-bcsc-core'
import { selectVerificationState } from './selectors'

jest.mock('@bifold/core', () => ({
  defaultState: { preferences: {}, tours: {}, onboarding: {}, loginAttempt: {}, migration: {} },
  mergeReducers: jest.fn((_base: any, custom: any) => custom),
  reducer: jest.fn(),
  PersistentStorage: { storeValueForKey: jest.fn() },
  LocalStorageKeys: { Preferences: 'PreferencesState' },
}))
jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'test-uuid') }))
jest.mock('react-native-config', () => ({ BUILD_TARGET: 'bcsc', DEFAULT_ENVIRONMENT: '' }))

const NOW = new Date('2026-10-19T12:00:00.000Z')

const credential = (bcscEvent: BCSCEvent): CredentialInfo => ({
  issuer: 'https://issuer.example.com',
  subject: 'user-123',
  label: 'BC Services Card',
  created: 1700000000,
  bcscEvent,
  bcscReason: BCSCReason.ApprovedByAgent,
})

type Step = (state: BCState) => BCState

const apply = (state: BCState, ...actions: { type: BCDispatchAction; payload?: unknown[] }[]): BCState =>
  actions.reduce((current, action) => reducer(current, action as any), state)

// The dispatches below are the only part of this file that follows the store's shape; the expected
// observations must not change when the saved status is replaced with facts.
const unlock =
  (record: CredentialInfo | null): Step =>
  (state) => {
    const credentialDeactivated = isCredentialDeactivated(record)
    return apply(state, {
      type: BCDispatchAction.HYDRATE_SECURE_STATE,
      payload: [
        {
          refreshToken: UNEXPIRED_JWT,
          verified: Boolean(record) && !credentialDeactivated,
          credentialDeactivated,
          inVerifyFlow: false,
        },
      ],
    })
  }

const expire: Step = (state) =>
  apply(
    state,
    {
      type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA,
      payload: [{ bcscEvent: BCSCEvent.Expire, bcscReason: BCSCReason.ExpiredBySystem }],
    },
    { type: BCDispatchAction.UPDATE_SECURE_CREDENTIAL_DEACTIVATED, payload: [true] }
  )

const enterFlow: Step = (state) =>
  apply(
    state,
    { type: BCDispatchAction.SET_VERIFICATION_STARTED, payload: [true] },
    { type: BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, payload: [true] }
  )

const leaveFlow: Step = (state) =>
  apply(state, { type: BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, payload: [false] })

// Verification reset clears memory (tokens included); the native records are read back at the next unlock
const reset =
  (stayInFlow: boolean): Step =>
  (state) =>
    apply(state, {
      type: BCDispatchAction.CLEAR_SECURE_STATE,
      payload: [
        {
          isHydrated: true,
          registrationAccessToken: state.bcscSecure.registrationAccessToken,
          verified: false,
          inVerifyFlow: stayInFlow,
        },
      ],
    })

interface Observation {
  verifyStackShown: boolean
  accountLoadingAllowed: boolean
  homeNotice: HomeNoticeType
  resumeRoute: ResumeStepRoute['name'] | null
}

const observe = (state: BCState): Observation => {
  const { isVerified, isVerificationInProgress, isDeviceVerifiedByIas } = selectVerificationState(state)
  const verifyStackShown = !isVerified && isVerificationInProgress

  return {
    verifyStackShown,
    accountLoadingAllowed: isDeviceVerifiedByIas,
    homeNotice: selectHomeNotice(state, null, NOW).type,
    resumeRoute: verifyStackShown ? getResumeStepRoute(state).name : null,
  }
}

const transitions: [string, Step][] = [
  ['enter the flow', enterFlow],
  ['leave the flow', leaveFlow],
  ['enter the flow again', enterFlow],
  ['reset, leaving the flow', reset(false)],
  ['reset, staying in the flow', reset(true)],
]

const scenarios: { name: string; start: Step; unlockAgain: Step }[] = [
  {
    name: 'unlocked with a deactivated record',
    start: unlock(credential(BCSCEvent.Cancel)),
    unlockAgain: unlock(credential(BCSCEvent.Cancel)),
  },
  {
    name: 'token-only account, then the credential expires',
    start: (state) => expire(unlock(null)(state)),
    unlockAgain: unlock(null),
  },
  {
    name: 'in the verify flow when the credential expires',
    start: (state) => expire(enterFlow(unlock(null)(state))),
    unlockAgain: unlock(null),
  },
  {
    name: 'finished account, then the credential expires',
    start: (state) => expire(unlock(credential(BCSCEvent.Authorization))(state)),
    unlockAgain: unlock(credential(BCSCEvent.Authorization)),
  },
]

const row = (
  verifyStackShown: boolean,
  accountLoadingAllowed: boolean,
  homeNotice: HomeNoticeType,
  resumeRoute: ResumeStepRoute['name'] | null
): Observation => ({ verifyStackShown, accountLoadingAllowed, homeNotice, resumeRoute })

// One row per step: the start, each transition in order, then unlocking again. Recorded from the
// saved-status implementation, so a change here is a change in what users see.
const expected: Record<string, Observation[]> = {
  'unlocked with a deactivated record': [
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, true, HomeNoticeType.BCSCVerified, BCSCScreens.VerificationSuccess),
    row(false, true, HomeNoticeType.BCSCVerified, null),
    row(true, true, HomeNoticeType.BCSCVerified, BCSCScreens.VerificationSuccess),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
  ],
  'token-only account, then the credential expires': [
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, true, HomeNoticeType.BCSCVerified, BCSCScreens.VerificationSuccess),
    row(false, true, HomeNoticeType.BCSCVerified, null),
    row(true, true, HomeNoticeType.BCSCVerified, BCSCScreens.VerificationSuccess),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, true, HomeNoticeType.BCSCVerified, null),
  ],
  'in the verify flow when the credential expires': [
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, true, HomeNoticeType.BCSCVerified, BCSCScreens.VerificationSuccess),
    row(false, true, HomeNoticeType.BCSCVerified, null),
    row(true, true, HomeNoticeType.BCSCVerified, BCSCScreens.VerificationSuccess),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, true, HomeNoticeType.BCSCVerified, null),
  ],
  'finished account, then the credential expires': [
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, true, HomeNoticeType.AccountExpired, null),
  ],
}

describe('verification transitions', () => {
  it.each(scenarios)('$name', ({ name, start, unlockAgain }) => {
    let state = start(initialState)
    const observed: Observation[] = [observe(state)]
    for (const [, step] of transitions) {
      state = step(state)
      observed.push(observe(state))
    }
    state = unlockAgain(state)
    observed.push(observe(state))

    expect(observed).toEqual(expected[name])
  })
})
