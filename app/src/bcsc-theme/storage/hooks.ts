import type { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { isCredentialDeactivated } from '@/bcsc-theme/utils/bcsc-credential'
import type { CredentialInfo, NativeAccount, PINAccount } from 'react-native-bcsc-core'
import { storage, useBCSCStore } from '.'
import type { BCSCStore } from './slices'

// A whole slice with its actions, `const { inVerifyFlow, setInVerifyFlow } = useSession()`, re-rendering for any
// change to that slice. Pass a selector to pick from it, `useSession((s) => s.inVerifyFlow)`, and re-render only
// when that value changes.
type SliceHook<K extends keyof BCSCStore> = {
  (): BCSCStore[K]
  <T>(select: (slice: BCSCStore[K]) => T): T
}

const sliceHook =
  <K extends keyof BCSCStore>(name: K): SliceHook<K> =>
  <T>(select?: (slice: BCSCStore[K]) => T) =>
    useBCSCStore((s) => (select ? select(s[name]) : s[name])) as T

export const useApp = sliceHook('app')
export const usePreferences = sliceHook('preferences')
export const useDeveloper = sliceHook('developer')
export const useContacts = sliceHook('contacts')
export const useAccount = sliceHook('account')
export const useVerification = sliceHook('verification')
export const useSavedServices = sliceHook('savedServices')
export const useSession = sliceHook('session')

// Which to use:
// - Components: the slice hooks, for what they render and the actions they call. Destructure by default; select in
//   components high in the tree (RootStack, providers), where a whole-slice subscription re-renders everything below.
// - Shared hooks that render nothing (useSecureActions, useFactoryReset, the API hooks): getBCSCState() in their
//   callbacks, so the many components using them don't re-render for every write to the slices they touch.
// - Anywhere, a value that must be current when a callback runs (after an await, on a timer, in a stable focus
//   effect): getBCSCState(), since a value from render can be stale by then.
// - Outside React: services and system checks: getBCSCState().
export const getBCSCState = (): BCSCStore => storage.store.getState()

// Worked out instead of stored

// Replaces the stored hasAccount flag. open() blocks on locked or unreadable, so undefined here means absent.
export const selectHasAccount = (s: BCSCStore) => s.account.profile !== undefined
export const useHasAccount = () => useBCSCStore(selectHasAccount)

export const selectCredentialDeactivated = (s: BCSCStore) =>
  isCredentialDeactivated((s.account.credential ?? null) as CredentialInfo | null)
export const useCredentialDeactivated = () => useBCSCStore(selectCredentialDeactivated)

// A credential record exists, active or not. Whether the card is active is `isCardInactive`'s question.
export const selectVerified = (s: BCSCStore) => s.account.credential !== undefined
export const useVerified = () => useBCSCStore(selectVerified)

// A verified account with no refresh token can't get new tokens
export const selectSessionRecoveryRequired = (s: BCSCStore) =>
  selectVerified(s) && selectHasAccount(s) && !s.account.tokens?.refreshToken
export const useSessionRecoveryRequired = () => useBCSCStore(selectSessionRecoveryRequired)

// The name the user gave the account. displayName covers accounts carried over from v3 ias-ios.
export const selectNickname = (s: BCSCStore) =>
  s.account.profile?.nickname?.trim() || s.account.profile?.displayName?.trim() || undefined
export const useNickname = () => useBCSCStore(selectNickname)

// As hydrate merged them: the flags' copy, or the request's once it's verified
export const selectEmailAddress = (s: BCSCStore) =>
  s.verification.flags?.emailAddress ?? s.verification.request?.verifiedEmail
export const useEmailAddress = () => useBCSCStore(selectEmailAddress)

export const selectSecurityMethod = (s: BCSCStore) => s.account.profile?.securityMethod
export const useSecurityMethod = () => useBCSCStore(selectSecurityMethod)

// Native keeps dates as epoch seconds and the options as one string. Converted once per value, so each keeps its
// identity while the stored value is unchanged (it's in effect dependencies, and selectors must return stable values).
const dates = new Map<number, Date>()
const epochDate = (seconds: number | undefined) => {
  if (!seconds) {
    return undefined
  }
  if (!dates.has(seconds)) {
    dates.set(seconds, new Date(seconds * 1000))
  }
  return dates.get(seconds)
}
const optionLists = new Map<string, DeviceVerificationOption[]>()
const splitOptions = (options: string | undefined) => {
  if (!options) {
    return undefined
  }
  if (!optionLists.has(options)) {
    optionLists.set(options, options.split(' ') as DeviceVerificationOption[])
  }
  return optionLists.get(options)
}

export const selectBirthdate = (s: BCSCStore) => epochDate(s.verification.request?.birthdate)
export const useBirthdate = () => useBCSCStore(selectBirthdate)

export const selectDeviceCodeExpiresAt = (s: BCSCStore) => epochDate(s.verification.request?.expiry)
export const useDeviceCodeExpiresAt = () => useBCSCStore(selectDeviceCodeExpiresAt)

export const selectVerificationOptions = (s: BCSCStore) => splitOptions(s.verification.request?.verificationOptions)
export const useVerificationOptions = () => useBCSCStore(selectVerificationOptions)

// The request's back-check ID, which the verify flow calls the verification request ID
export const selectVerificationRequestId = (s: BCSCStore) => s.verification.request?.backCheckVerificationId
export const useVerificationRequestId = () => useBCSCStore(selectVerificationRequestId)

// The account in bcsc-core's getAccount() shape, for code written against it. Null without an account.
export const selectAccountRecord = (s: BCSCStore): NativeAccount | null => {
  const profile = s.account.profile
  if (!profile) {
    return null
  }
  return {
    id: profile.accountId,
    issuer: profile.issuer,
    clientID: profile.clientId,
    securityMethod: profile.securityMethod,
    nickname: profile.nickname,
    displayName: profile.displayName,
    didPostNicknameToServer: profile.didPostNicknameToServer,
  }
}

// What bcsc-core's PIN and device-security methods find the PIN through
export const selectPINAccount = (s: BCSCStore): PINAccount | undefined => {
  const profile = s.account.profile
  return profile ? { accountId: profile.accountId, issuer: profile.issuer } : undefined
}

// Carries the code bcsc-core rejected with when it read the account itself, so it maps to the same error
export class NoPINAccountError extends Error {
  readonly code = 'E_ACCOUNT_NOT_FOUND'

  constructor() {
    super('No account to find the PIN through')
    this.name = 'NoPINAccountError'
  }
}

// For a PIN call that can't run without an account
export const requirePINAccount = (): PINAccount => {
  const account = selectPINAccount(storage.store.getState())
  if (!account) {
    throw new NoPINAccountError()
  }
  return account
}
