import { z } from 'zod'
import type { LegacyRecord, LegacySnapshot, LegacyValues } from '../legacy/native'
import { LegacyNotReadyError, type Migration, type MigrationContext, VerifyError } from './types'

// Frozen copies of the native backend's read mapping at s1; never imported from it
const toProfileV2 = (account: LegacyValues['account']) => ({
  accountId: account.id,
  clientId: account.clientID,
  issuer: account.issuer,
  securityMethod: account.securityMethod,
  nickname: account.nickname,
  displayName: account.displayName,
  didPostNicknameToServer: account.didPostNicknameToServer,
})
const toTokensV2 = (tokens: LegacyValues['tokens']) => ({
  accessToken: tokens.access,
  refreshToken: tokens.refresh,
  registrationAccessToken: tokens.registration,
})
const toFlagsV2 = ({ notShowDeviceAuthenticationPrepAgain: _, ...flags }: LegacyValues['accountFlags']) => flags // eslint-disable-line @typescript-eslint/no-unused-vars
const toSavedServicesV2 = (services: LegacyValues['savedServices']) => ({
  ids: services.filter((s) => s.bookmarked).map((s) => s.clientRefId),
})

// bcsc-core's records come from Swift dictionaries, where nil reaches JS as null; the stored shapes say absent
type WithoutNulls<T> = T extends null ? undefined : T extends object ? { [K in keyof T]: WithoutNulls<T[K]> } : T
const withoutNulls = <T>(value: T): WithoutNulls<T> => {
  if (Array.isArray(value)) {
    return value.map(withoutNulls) as WithoutNulls<T>
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, field]) => field !== null)
        .map(([key, field]) => [key, withoutNulls(field)])
    ) as WithoutNulls<T>
  }
  return value as WithoutNulls<T>
}
const stripRecord = <T>(record: LegacyRecord<T>): LegacyRecord<T> =>
  record.status === 'ok' ? { status: 'ok', value: withoutNulls(record.value) as T } : record

// Frozen copies of the s2 slice schemas. verify parses what up wrote with them, so a value the app would read as
// unreadable stops this step, while the native originals are still there (m0003 deletes them).
const ProfileV2 = z.object({
  accountId: z.string(),
  // Absent until the device registers (#5159)
  clientId: z.string().optional(),
  issuer: z.string(),
  securityMethod: z.enum(['app_pin_no_device_authn', 'app_pin_has_device_authn', 'device_authentication']),
  nickname: z.string().optional(),
  displayName: z.string().optional(),
  didPostNicknameToServer: z.boolean().optional(),
})
const TokensV2 = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  registrationAccessToken: z.string().optional(),
})
const CredentialV2 = z.looseObject({
  issuer: z.string(),
  subject: z.string(),
  label: z.string(),
  created: z.number(),
  // Null in v3 on a card with no event, so absent here
  bcscEvent: z.string().optional(),
  bcscReason: z.string().optional(),
})
const RequestV2 = z.looseObject({
  issuer: z.string().optional(),
  clientID: z.string().optional(),
  deviceCode: z.string().optional(),
  userCode: z.string().optional(),
  birthdate: z.number().optional(),
  csn: z.string().optional(),
  verifiedEmail: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleNames: z.string().optional(),
  address: z
    .object({
      streetAddress: z.string().optional(),
      locality: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      region: z.string().optional(),
    })
    .optional(),
  status: z.number().optional(),
  method: z.number().optional(),
  audience: z.string().optional(),
  scope: z.string().optional(),
  redirectURI: z.string().optional(),
  requestedAt: z.number().optional(),
  expiry: z.number().optional(),
  authorizationExpiry: z.number().optional(),
  verificationOptions: z.string().optional(),
  verificationURIVideo: z.string().optional(),
  backCheckSubmittedDate: z.number().optional(),
  backCheckVerificationId: z.string().optional(),
  evidenceUploadURI: z.string().optional(),
})
const FlagsV2 = z.object({
  isEmailVerified: z.boolean().optional(),
  userSkippedEmailVerification: z.boolean().optional(),
  emailAddress: z.string().optional(),
  temporaryEmailId: z.string().optional(),
  userSubmittedVerificationVideo: z.boolean().optional(),
})
const EvidenceV2 = z.array(
  z.looseObject({
    evidenceType: z.looseObject({ evidence_type: z.string() }).optional(),
    metadata: z.array(z.looseObject({})),
    documentNumber: z.string().optional(),
  })
)
const SavedServicesV2 = z.object({ ids: z.array(z.string()) })

const BlobNickname = z.looseObject({ selectedNickname: z.string().optional() })

const withoutNullRecords = (snapshot: LegacySnapshot): LegacySnapshot =>
  Object.fromEntries(
    Object.entries(snapshot).map(([name, record]) => [name, stripRecord(record as LegacyRecord<unknown>)])
  ) as LegacySnapshot

const notReady = (snapshot: LegacySnapshot) => {
  const records = Object.entries(snapshot).filter(([, r]) => r.status === 'unreadable' || r.status === 'locked')
  if (records.length === 0) {
    return undefined
  }
  const status = records.some(([, r]) => r.status === 'locked') ? 'locked' : 'unreadable'
  return new LegacyNotReadyError(records.map(([name]) => name).join(','), status)
}

// The blob alone has the nickname when the server update after verification failed
const blobNickname = async (legacy: MigrationContext['legacy'], nativeNickname: string | undefined) => {
  const blob = await legacy.async('BCSC')
  const selectedNickname = blob.status === 'ok' ? BlobNickname.safeParse(blob.value).data?.selectedNickname : undefined
  if (!selectedNickname || selectedNickname === nativeNickname) {
    return {}
  }
  return { nickname: selectedNickname, didPostNicknameToServer: false }
}

export const m0002: Migration = {
  version: 2,
  id: 'move-native-data',

  async up({ legacy, put }) {
    const snapshot = withoutNullRecords(await legacy.native())
    // Retry later; never import an unreadable record as empty
    const error = notReady(snapshot)
    if (error) {
      throw error
    }

    const { account, tokens, credential, authorizationRequest, accountFlags, evidence, savedServices } = snapshot
    if (account.status === 'ok') {
      await put('encrypted', 'account/profile', {
        ...toProfileV2(account.value),
        ...(await blobNickname(legacy, account.value.nickname)),
      })
    }
    if (tokens.status === 'ok') {
      await put('keychain', 'account/tokens', toTokensV2(tokens.value))
    }
    if (credential.status === 'ok') {
      await put('encrypted', 'account/credential', credential.value)
    }
    if (authorizationRequest.status === 'ok') {
      await put('encrypted', 'verification/request', authorizationRequest.value)
    }
    if (accountFlags.status === 'ok') {
      await put('encrypted', 'verification/flags', toFlagsV2(accountFlags.value))
    }
    if (evidence.status === 'ok') {
      await put('encrypted', 'verification/evidence', evidence.value)
    }
    if (savedServices.status === 'ok') {
      await put('encrypted', 'savedServices', toSavedServicesV2(savedServices.value))
    }
    // The PIN stays in bcsc-core, found through the profile's accountId and issuer
  },

  async verify({ legacy, read }) {
    const snapshot = withoutNullRecords(await legacy.native())
    // Each written value must parse as the app will read it. Every failure is collected, so the log names them all.
    const failed: string[] = []
    const check = async <S extends z.ZodType>(backend: 'encrypted' | 'keychain', key: string, schema: S) => {
      const parsed = schema.safeParse(await read(backend, key))
      if (!parsed.success) {
        failed.push(key)
        return undefined
      }
      return parsed.data as z.infer<S>
    }
    if (snapshot.account.status === 'ok') {
      const profile = await check('encrypted', 'account/profile', ProfileV2)
      if (profile && profile.accountId !== snapshot.account.value.id) {
        failed.push('account.id')
      }
    }
    if (snapshot.tokens.status === 'ok') {
      const stored = await check('keychain', 'account/tokens', TokensV2)
      if (stored && stored.refreshToken !== snapshot.tokens.value.refresh) {
        failed.push('account.tokens')
      }
    }
    const records: [string, LegacyRecord<unknown>, z.ZodType][] = [
      ['account/credential', snapshot.credential, CredentialV2],
      ['verification/request', snapshot.authorizationRequest, RequestV2],
      ['verification/flags', snapshot.accountFlags, FlagsV2],
      ['verification/evidence', snapshot.evidence, EvidenceV2],
      ['savedServices', snapshot.savedServices, SavedServicesV2],
    ]
    for (const [key, record, schema] of records) {
      if (record.status === 'ok') {
        await check('encrypted', key, schema)
      }
    }
    if (failed.length > 0) {
      throw new VerifyError(failed)
    }
  },
}
