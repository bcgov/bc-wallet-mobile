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

// Only the dispatches below follow the store's shape; the expected observations are what users see
// and must survive a store reshape.
const unlock =
  (record: CredentialInfo | null): Step =>
  (state) => {
    return apply(state, {
      type: BCDispatchAction.HYDRATE_SECURE_STATE,
      payload: [
        {
          refreshToken: UNEXPIRED_JWT,
          verified: Boolean(record),
          credentialDeactivated: isCredentialDeactivated(record),
          inVerifyFlow: false,
        },
      ],
    })
  }

const expire: Step = (state) =>
  apply(state, {
    type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA,
    payload: [{ bcscEvent: BCSCEvent.Expire, bcscReason: BCSCReason.ExpiredBySystem }],
  })

const enterFlow: Step = (state) =>
  apply(
    state,
    { type: BCDispatchAction.SET_VERIFICATION_STARTED, payload: [true] },
    { type: BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, payload: [true] }
  )

const leaveFlow: Step = (state) =>
  apply(state, { type: BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, payload: [false] })

// Verification reset clears memory (tokens included), then the saved account details once the native
// deletes succeed; the native records are read back at the next unlock
const reset =
  (stayInFlow: boolean): Step =>
  (state) =>
    apply(
      state,
      {
        type: BCDispatchAction.CLEAR_SECURE_STATE,
        payload: [
          {
            isHydrated: true,
            registrationAccessToken: state.bcscSecure.registrationAccessToken,
            verified: false,
            inVerifyFlow: stayInFlow,
          },
        ],
      },
      { type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA, payload: [undefined] }
    )

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

const restartTransitions: [string, Step][] = [
  ['enter the flow', enterFlow],
  ['leave the flow', leaveFlow],
  ['enter the flow again', enterFlow],
]

const scenarios: { name: string; start: Step; unlockAgain: Step; steps?: [string, Step][] }[] = [
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
  {
    name: 'token-only account, expires, then a restart with no reset',
    start: (state) => expire(unlock(null)(state)),
    unlockAgain: unlock(null),
    steps: restartTransitions,
  },
  {
    name: 'finished account, expires, then a restart with no reset',
    start: (state) => expire(unlock(credential(BCSCEvent.Authorization))(state)),
    unlockAgain: unlock(credential(BCSCEvent.Authorization)),
    steps: restartTransitions,
  },
]

const row = (
  verifyStackShown: boolean,
  accountLoadingAllowed: boolean,
  homeNotice: HomeNoticeType,
  resumeRoute: ResumeStepRoute['name'] | null
): Observation => ({ verifyStackShown, accountLoadingAllowed, homeNotice, resumeRoute })

// One row per step: the start, each transition in order, then unlocking again. A change here is a
// change in what users see.
const expected: Record<string, Observation[]> = {
  'unlocked with a deactivated record': [
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, true, HomeNoticeType.AccountExpired, null),
  ],
  'token-only account, then the credential expires': [
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, true, HomeNoticeType.BCSCVerified, null),
  ],
  'in the verify flow when the credential expires': [
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
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
    row(false, true, HomeNoticeType.None, null),
  ],
  'token-only account, expires, then a restart with no reset': [
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
    row(true, false, HomeNoticeType.None, BCSCScreens.AccountSetup),
    row(false, false, HomeNoticeType.BCSCStartVerification, null),
  ],
  'finished account, expires, then a restart with no reset': [
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
    row(false, true, HomeNoticeType.AccountExpired, null),
  ],
}

describe('verification transitions', () => {
  it.each(scenarios)('$name', ({ name, start, unlockAgain, steps = transitions }) => {
    let state = start(initialState)
    const observed: Observation[] = [observe(state)]
    for (const [, step] of steps) {
      state = step(state)
      observed.push(observe(state))
    }
    state = unlockAgain(state)
    observed.push(observe(state))

    expect(observed).toEqual(expected[name])
  })
})
