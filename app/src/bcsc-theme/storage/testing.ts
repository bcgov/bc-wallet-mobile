import type { VerificationJourney } from '@/bcsc-theme/state/verification/journey'
import { storage } from '.'
import type { BCSCStore, SliceName } from './slices'

// Test helpers for components and hooks that read the BCSC store. Not for production code.

// Fields and actions: pass jest.fn() for an action to assert on calls instead of on the result
export type BCSCStoreSeed = { [N in SliceName]?: Partial<BCSCStore[N]> }

type ReportedDispatch = (action: { type: string; payload?: unknown[] }) => void
let reporter: ReportedDispatch | undefined

// Back to the initial state, every key absent. Run before each test (jestSetupAfterEnv.js). Keeps reporting
// session writes if a test asked for it.
export const resetBCSCStore = () => {
  storage.reset()
  if (reporter) {
    applyReporter(reporter)
  }
}

// Merges the given fields into their slices, without touching storage. Real actions still write through persistence.
export const seedBCSCStore = (seed: BCSCStoreSeed) => {
  storage.store.setState(
    (state) =>
      Object.fromEntries(
        Object.entries(seed).map(([slice, fields]) => [slice, { ...state[slice as SliceName], ...fields }])
      ) as Partial<BCSCStore>
  )
}

interface LegacyStateShape {
  stateLoaded?: boolean
  developer?: Omit<Partial<BCSCStore['developer']>, 'remoteDebugging'> & {
    remoteDebugging?: { enabledAt?: Date | string; sessionId?: number }
  }
  preferences?: Partial<BCSCStore['preferences']> & { alternateContactNames?: Record<string, string> }
  bcsc?: Record<string, unknown>
  bcscSecure?: Record<string, unknown>
  authentication?: Record<string, unknown>
}

const APP_FIELDS = [
  'installId',
  'accountSetupType',
  'appVersion',
  'appBuildNumber',
  'lastSeenAppVersion',
  'lastSeenAppBuildNumber',
  'lastKeyRotationAttemptAt',
  'analyticsOptIn',
  'acceptedTermsOfUseVersion',
  'hasSeenOnboardingIntro',
  'hasDismissedThirdPartyKeyboardAlert',
  'hasDismissedDeviceAuthInfo',
  'verificationSkipped',
  'verificationStarted',
  'dismissedBanners',
]
const SESSION_FIELDS = ['photoPath', 'photoMetadata', 'videoPath', 'videoThumbnailPath', 'videoDuration', 'prompts']
// bcscSecure fields that live in the session slice
const SECURE_SESSION_FIELDS = [
  'isHydrated',
  'walletKey',
  'userMetadata',
  'residentialAddressDraft',
  'inVerifyFlow',
  'credentialDeactivated',
  'verificationRequestSha',
  'verificationRequestStatus',
  'verificationRequestStatusMessage',
  'verificationVideoSubmittedAt',
]

const toEpoch = (date: unknown) => (date instanceof Date ? Math.floor(date.getTime() / 1000) : undefined)

// The bcscSecure fields that now come from the native authorization request, in that record's shape
const requestFromBCState = (secure: Record<string, unknown> | undefined) => {
  const request = Object.fromEntries(
    Object.entries({
      csn: secure?.serial,
      birthdate: toEpoch(secure?.birthdate),
      deviceCode: secure?.deviceCode,
      userCode: secure?.userCode,
      expiry: toEpoch(secure?.deviceCodeExpiresAt),
      verificationOptions: Array.isArray(secure?.verificationOptions)
        ? (secure.verificationOptions as string[]).join(' ') || undefined
        : undefined,
      backCheckVerificationId: secure?.verificationRequestId,
    }).filter(([, value]) => value !== undefined)
  )
  return Object.keys(request).length ? { request: request as never } : {}
}

const FLAG_FIELDS = [
  'isEmailVerified',
  'userSkippedEmailVerification',
  'emailAddress',
  'temporaryEmailId',
  'userSubmittedVerificationVideo',
]
const flagsFromBCState = (secure: Record<string, unknown> | undefined) => {
  const flags = pick(secure, FLAG_FIELDS)
  return Object.keys(flags).length ? { flags: flags as never } : {}
}

const TOKEN_FIELDS = ['refreshToken', 'registrationAccessToken', 'accessToken']

// sessionRecoveryRequired is worked out now (verified, no refresh token), so a verified test state that
// doesn't ask for recovery gets a stand-in refresh token
const tokensFromBCState = (secure: Record<string, unknown> | undefined) => {
  const tokens: Record<string, unknown> = pick(secure, TOKEN_FIELDS)
  if (secure?.verified && secure.sessionRecoveryRequired !== true && !tokens.refreshToken) {
    tokens.refreshToken = 'test-refresh-token'
  }
  return Object.keys(tokens).length ? { tokens: tokens as never } : {}
}

const pick = (source: Record<string, unknown> | undefined, fields: string[]) =>
  Object.fromEntries(fields.filter((field) => source?.[field] !== undefined).map((field) => [field, source?.[field]]))

// For tests that still build a Bifold-shaped state object: copies the fields that have moved into the BCSC store
export const seedBCSCStoreFromBCState = (state: LegacyStateShape, { reset = true } = {}) => {
  if (reset) {
    resetBCSCStore()
  }
  const { developer, preferences, bcsc, bcscSecure, authentication } = state
  seedBCSCStore({
    app: pick(bcsc, APP_FIELDS),
    session: {
      ...pick(bcsc, SESSION_FIELDS),
      ...pick(bcscSecure, SECURE_SESSION_FIELDS),
      ...pick(authentication, ['didAuthenticate']),
      ...pick(state as Record<string, unknown>, ['stateLoaded']),
    },
    account: {
      // Any profile will do for a test that says there's an account; it carries the nickname and method
      // A nickname or security method implies an account, unless the test says there isn't one
      ...(bcsc?.hasAccount || ((bcsc?.selectedNickname || bcscSecure?.securityMethod) && bcsc?.hasAccount !== false)
        ? {
            profile: {
              accountId: 'test-account-id',
              clientId: 'test-client-id',
              issuer: 'https://idsit.gov.bc.ca/device/',
              securityMethod: bcscSecure?.securityMethod as never,
              nickname: bcsc?.selectedNickname as string | undefined,
            },
          }
        : {}),
      ...(bcscSecure?.verified
        ? {
            credential: {
              issuer: 'https://idsit.gov.bc.ca/device/',
              subject: 'test-client-id',
              label: 'BC Services Card',
              created: 0,
              bcscEvent: 'Authorization' as const,
              bcscReason: 'Approved by Agent',
            },
          }
        : {}),
      ...(bcsc?.credentialMetadata ? { credentialMetadata: bcsc.credentialMetadata as never } : {}),
      ...tokensFromBCState(bcscSecure),
    },
    verification: {
      ...requestFromBCState(bcscSecure),
      ...flagsFromBCState(bcscSecure),
      ...(bcscSecure?.cardProcess ? { cardProcess: bcscSecure.cardProcess as never } : {}),
      ...(Array.isArray(bcscSecure?.additionalEvidenceData) && bcscSecure.additionalEvidenceData.length
        ? { evidence: bcscSecure.additionalEvidenceData as never }
        : {}),
    },
    ...(Array.isArray(bcscSecure?.savedServices)
      ? { savedServices: { ids: bcscSecure.savedServices as string[] } }
      : {}),
  })
  const enabledAt = developer?.remoteDebugging?.enabledAt
  seedBCSCStore({
    ...(developer
      ? {
          developer: {
            ...developer,
            remoteDebugging: {
              sessionId: developer.remoteDebugging?.sessionId,
              enabledAt: enabledAt instanceof Date ? enabledAt.toISOString() : enabledAt,
            },
          },
        }
      : {}),
    ...(preferences ? { preferences } : {}),
    ...(preferences?.alternateContactNames ? { contacts: { alternateNames: preferences.alternateContactNames } } : {}),
  })
}

// The same, returning the seeded state, for pure selectors that take one. Takes a whole BCState too.
export const storeFromBCState = (state: object): BCSCStore => {
  seedBCSCStoreFromBCState(state as LegacyStateShape)
  return storage.store.getState()
}

// For tests that still mock Bifold's useStore: seeds the BCSC store from the mocked state and passes the value
// through, `useStore.mockReturnValue(withBCSCStore([state, dispatch]))`. Merges, so an earlier seed stays.
export const withBCSCStore = <T extends unknown[]>(value: T): T => {
  seedBCSCStoreFromBCState((value[0] ?? {}) as LegacyStateShape, { reset: false })
  return value
}

// The old Bifold action types. Spelled out: importing @/store here breaks test files that mock @bifold/core.
const ACTION = {
  walletKey: 'bcsc/updateSecureWalletKey',
  inVerifyFlow: 'bcsc/updateSecureInVerifyFlow',
  statusReceived: 'bcsc/verificationStatusReceived',
} as const

const SESSION_UPDATE_ACTIONS: Record<string, string> = {
  verificationRequestSha: 'bcsc/updateSecureVerificationRequestSha',
  verificationRequestStatus: 'bcsc/updateSecureVerificationRequestStatus',
  verificationRequestStatusMessage: 'bcsc/updateSecureVerificationRequestStatusMessage',
  verificationVideoSubmittedAt: 'bcsc/updateSecureVerificationVideoSubmittedAt',
}

// For tests written against dispatched actions: the signed-in session's writes, which now go to the session slice,
// are also reported to `dispatch` in the old action's shape. The real actions still run, so the store changes too.
// Lasts for the rest of the test file (resets keep it), since Jest loads this module once per file.
export const reportSessionWritesAs = (dispatch: ReportedDispatch) => {
  reporter = dispatch
  storage.reset()
  applyReporter(dispatch)
}

const applyReporter = (dispatch: ReportedDispatch) => {
  const real = storage.store.getState().session
  const report = (type: string, value: unknown) => dispatch({ type, payload: [value] })
  seedBCSCStore({
    session: {
      setWalletKey: (walletKey) => {
        report(ACTION.walletKey, walletKey)
        real.setWalletKey(walletKey)
      },
      setInVerifyFlow: (inVerifyFlow) => {
        report(ACTION.inVerifyFlow, inVerifyFlow)
        real.setInVerifyFlow(inVerifyFlow)
      },
      verificationStatusReceived: (received) => {
        report(ACTION.statusReceived, received)
        real.verificationStatusReceived(received)
      },
      update: (patch) => {
        for (const [field, value] of Object.entries(patch)) {
          if (SESSION_UPDATE_ACTIONS[field]) {
            report(SESSION_UPDATE_ACTIONS[field], value)
          }
        }
        real.update(patch)
      },
    },
  })
}

type NativeAccount = import('react-native-bcsc-core').NativeAccount

// A complete native account record, for tests that mock bcsc-core's getAccount: a profile reload rejects a partial one
export const nativeAccount = (overrides: Partial<NativeAccount> = {}): NativeAccount => ({
  id: 'test-account-id',
  clientID: 'test-client-id',
  issuer: 'https://idsit.gov.bc.ca/device/',
  securityMethod: 'app_pin_no_device_authn' as NativeAccount['securityMethod'],
  ...overrides,
})

// The account, in bcsc-core's getAccount() shape, as the store's profile; null removes it. For tests written
// against a mocked getAccount: `seedAccount(nativeAccount())` where they had `getAccount.mockResolvedValue(...)`.
export const seedAccount = (account: Partial<NativeAccount> | null) => {
  storage.store.setState((state) => ({
    account: {
      ...state.account,
      profile: account
        ? {
            accountId: account.id ?? 'test-account-id',
            clientId: account.clientID ?? '',
            issuer: account.issuer ?? 'https://idsit.gov.bc.ca/device/',
            securityMethod: account.securityMethod ?? ('app_pin_no_device_authn' as NativeAccount['securityMethod']),
            nickname: account.nickname,
            displayName: account.displayName,
            didPostNicknameToServer: account.didPostNicknameToServer,
          }
        : undefined,
    },
  }))
}

// The stored tokens, merged; undefined drops one. For tests written against a mocked getToken.
export const seedTokens = (tokens: Partial<NonNullable<BCSCStore['account']['tokens']>>) => {
  storage.store.setState((state) => ({
    account: { ...state.account, tokens: { ...state.account.tokens, ...tokens } },
  }))
}

// A complete native credential record (CredentialInfo), for tests that mock bcsc-core's getCredential: a reload
// rejects a partial one
export const nativeCredential = (
  overrides: Partial<import('react-native-bcsc-core').CredentialInfo> = {}
): import('react-native-bcsc-core').CredentialInfo => ({
  issuer: 'https://idsit.gov.bc.ca/device/',
  subject: 'test-client-id',
  label: 'BC Services Card',
  created: 0,
  bcscEvent: 'Authorization',
  bcscReason: 'Approved by Agent',
  ...overrides,
})

// A new user's journey with the given fields, for the pure verification rules (getResumeStepRoute and friends)
export const makeJourney = (overrides: Partial<VerificationJourney> = {}): VerificationJourney => ({
  verified: false,
  credentialDeactivated: false,
  inVerifyFlow: false,
  sessionRecoveryRequired: false,
  additionalEvidenceData: [],
  ...overrides,
})
