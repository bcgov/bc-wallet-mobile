import type { AccountSecurityMethod, CredentialInfo } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'
import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

// A new account's profile, not saved yet. Onboarding sets its PIN (found through accountId) first and saves the
// profile once authenticated: hasAccount turning true before didAuthenticate would flash the unlock screen.
export const newProfile = (profile: Omit<Profile, 'accountId'>): Profile => ({ ...profile, accountId: String(uuid.v4()) })

export const ProfileSchema = z.object({
  accountId: z.string(),
  // Absent until the device registers
  clientId: z.string().optional(),
  issuer: z.string(),
  // AccountSecurityMethod's values, listed so the schema doesn't depend on the native module loading
  securityMethod: z.enum([
    'app_pin_no_device_authn',
    'app_pin_has_device_authn',
    'device_authentication',
  ]) as unknown as z.ZodType<AccountSecurityMethod>,
  nickname: z.string().optional(),
  displayName: z.string().optional(),
  didPostNicknameToServer: z.boolean().optional(),
})
export type Profile = z.infer<typeof ProfileSchema>

export const TokensSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  registrationAccessToken: z.string().optional(),
})
export type Tokens = z.infer<typeof TokensSchema>

// The native credential record that marks the account verified. Loose, so native fields survive a write.
export const CredentialSchema = z.looseObject({
  issuer: z.string(),
  subject: z.string(),
  label: z.string(),
  created: z.number(),
  // CredentialInfo's events, not checked: an event native wrote that isn't listed would make the record
  // unreadable and stop the app opening. v3 leaves both null on a card with no event, which loads as absent.
  bcscEvent: z.string().optional(),
  bcscReason: z.string().optional(),
  bcscStatusDate: z.number().nullish(),
  bcscEventDate: z.number().nullish(),
  devicesCount: z.number().nullish(),
  maxDevices: z.number().nullish(),
  cardType: z.string().optional(),
  accountType: z.string().optional(),
  cardExpiry: z.string().nullish(),
}) as unknown as z.ZodType<CredentialInfo>
export type Credential = CredentialInfo

export const CredentialMetadataSchema = z.object({
  fullName: z.string(),
  bcscReason: z.string(),
  deviceCount: z.number(),
  deviceLimit: z.number(),
  cardType: z.string(),
  // bcsc_status_date from the token response
  lastUpdated: z.number(),
})
export type CredentialMetadata = z.infer<typeof CredentialMetadataSchema>

export const PinAttemptsSchema = z.object({
  failedCount: z.number().int().nonnegative(),
  lastAttemptAt: z.number(), // epoch milliseconds
})
export type PinAttempts = z.infer<typeof PinAttemptsSchema>

export const ACCOUNT_KEYS = {
  profile: persistedKey({ key: 'account/profile', schema: ProfileSchema, backend: 'encrypted' }),
  tokens: persistedKey({ key: 'account/tokens', schema: TokensSchema, backend: 'keychain' }),
  credential: persistedKey({ key: 'account/credential', schema: CredentialSchema, backend: 'encrypted' }),
  credentialMetadata: persistedKey({
    key: 'account/credentialMetadata',
    schema: CredentialMetadataSchema,
    backend: 'encrypted',
  }),
  pinAttempts: persistedKey({ key: 'account/pinAttempts', schema: PinAttemptsSchema, backend: 'plain' }),
}

export interface AccountSlice {
  account: {
    profile?: Profile
    tokens?: Tokens
    credential?: Credential
    credentialMetadata?: CredentialMetadata
    pinAttempts?: PinAttempts
    setProfile(profile: Profile): Promise<void>
    // A new account, with a new ID (newProfile). Returns the profile it saved.
    createProfile(profile: Omit<Profile, 'accountId'>): Promise<Profile>
    updateProfile(patch: Partial<Profile>): Promise<void>
    // Factory reset: hasAccount goes false
    removeProfile(): Promise<void>
    // After a failed setTokens: the session carries on with these, the backend keeps the old ones (#4645)
    keepTokensInMemory(tokens: Partial<Tokens>): void
    // Merges into the stored tokens; pass undefined for a token to drop it
    setTokens(tokens: Partial<Tokens>): Promise<void>
    clearTokens(): Promise<void>
    setCredential(credential: Credential | undefined): Promise<void>
    setCredentialMetadata(metadata: CredentialMetadata | undefined): Promise<void>
    setPinAttempts(attempts: PinAttempts | undefined): Promise<void>
  }
}

export class NoAccountError extends Error {
  constructor() {
    super('No account profile to update')
    this.name = 'NoAccountError'
  }
}

export const createAccountSlice =
  ({ persist }: SliceContext): BCSCSlice<AccountSlice> =>
  (_set, get) => ({
    account: {
      setProfile: (profile) => persist.write(ACCOUNT_KEYS.profile, profile),
      createProfile: async (profile) => {
        const created = newProfile(profile)
        await persist.write(ACCOUNT_KEYS.profile, created)
        return created
      },
      removeProfile: () => persist.remove(ACCOUNT_KEYS.profile),
      keepTokensInMemory: (tokens) => persist.remember(ACCOUNT_KEYS.tokens, { ...get().account.tokens, ...tokens }),
      updateProfile: (patch) =>
        persist.update(ACCOUNT_KEYS.profile, (profile) => {
          if (!profile) {
            throw new NoAccountError()
          }
          return { ...profile, ...patch }
        }),
      setTokens: (tokens) => persist.update(ACCOUNT_KEYS.tokens, (current) => ({ ...current, ...tokens })),
      clearTokens: () => persist.remove(ACCOUNT_KEYS.tokens),
      setCredential: (credential) =>
        credential ? persist.write(ACCOUNT_KEYS.credential, credential) : persist.remove(ACCOUNT_KEYS.credential),
      setCredentialMetadata: (metadata) =>
        metadata
          ? persist.write(ACCOUNT_KEYS.credentialMetadata, metadata)
          : persist.remove(ACCOUNT_KEYS.credentialMetadata),
      setPinAttempts: (attempts) =>
        attempts ? persist.write(ACCOUNT_KEYS.pinAttempts, attempts) : persist.remove(ACCOUNT_KEYS.pinAttempts),
    },
  })
