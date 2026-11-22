import { z } from 'zod'
import type { LegacyAsyncKey } from '../legacy/async-storage'
import type { LegacySnapshot } from '../legacy/native'
import { LegacyNotReadyError, type Migration, type MigrationContext, VerifyError } from './types'

// Frozen s0 shapes, read loosely: any field may be missing or malformed, and a bad field is dropped alone
type Loose<T extends Record<string, z.ZodType>> = { [K in keyof T]: z.ZodCatch<z.ZodOptional<T[K]>> }
const loose = <T extends Record<string, z.ZodType>>(shape: T) =>
  z.object(Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, v.optional().catch(undefined)])) as Loose<T>)

const LegacyPreferences = loose({
  autoLockTime: z.number(),
  developerModeEnabled: z.boolean(),
  usePushNotifications: z.boolean(),
  selectedMediator: z.string(),
  availableMediators: z.array(z.string()),
  proofRequestExpirationMs: z.number(),
  walletName: z.string(),
  theme: z.string(),
  alternateContactNames: z.record(z.string(), z.string()),
})

const LegacyCredentialMetadata = z.object({
  fullName: z.string(),
  bcscReason: z.string(),
  deviceCount: z.number(),
  deviceLimit: z.number(),
  cardType: z.string(),
  lastUpdated: z.number(),
})

const LegacyAppBuild = z.object({ version: z.string(), build: z.string() })

const LegacyBCSC = loose({
  installId: z.string(),
  reportUUID: z.string(),
  // Before #5166: the registered build, and the build last launched
  appVersion: z.string(),
  appBuildNumber: z.string(),
  lastSeenAppVersion: z.string(),
  lastSeenAppBuildNumber: z.string(),
  // From #5166, on builds made from main before 4.3.0
  appBuildHistory: z.array(LegacyAppBuild),
  registeredBuild: LegacyAppBuild,
  lastKeyRotationAttemptAt: z.string(),
  hasAccount: z.boolean(),
  analyticsOptIn: z.boolean(),
  acceptedTermsOfUseVersion: z.string(),
  hasSeenOnboardingIntro: z.boolean(),
  accountSetupType: z.enum(['AddAccount', 'TransferAccount']),
  hasDismissedThirdPartyKeyboardAlert: z.boolean(),
  hasDismissedDeviceAuthInfo: z.boolean(),
  verificationSkipped: z.boolean(),
  verificationStarted: z.boolean(),
  dismissedBanners: z.record(z.string(), z.object({ dismissedAt: z.number() })),
  selectedNickname: z.string(),
  credentialMetadata: LegacyCredentialMetadata,
})
type LegacyBCSCState = z.infer<typeof LegacyBCSC>

const LegacyEnvironment = z.object({
  name: z.string(),
  iasAgentInviteUrl: z.string(),
  iasPortalUrl: z.string(),
  appToAppUrl: z.string(),
  iasApiBaseUrl: z.string(),
  analyticsAppId: z.string(),
})
const LegacyRemoteDebugging = loose({ enabledAt: z.string(), sessionId: z.number() })
const LegacyPinAttempts = z.object({ version: z.literal(1), failedCount: z.number(), lastAttemptAt: z.number() })

// Frozen s1 values and shapes
const PREFERENCES_V1 = {
  autoLockTime: 5,
  developerModeEnabled: false,
  usePushNotifications: false,
  selectedMediator: '',
  availableMediators: [] as string[],
  proofRequestExpirationMs: 172_800_000,
}
const AppV1 = z.looseObject({
  installId: z.string().optional(),
  verificationSkipped: z.boolean().optional(),
  verificationStarted: z.boolean().optional(),
})
const ContactsV1 = z.looseObject({ pinned: z.array(z.string()) })

// A frozen copy of migrateBCSCState's build seeding (#5166): the registered pair is the build the server knows
// about, the last seen pair the build last launched. The running build is added at startup, not here.
const toAppBuild = (version?: string, build?: string) => (version && build ? { version, build } : undefined)
const appBuilds = (bcsc: LegacyBCSCState | undefined) => {
  const registeredBuild = bcsc?.registeredBuild ?? toAppBuild(bcsc?.appVersion, bcsc?.appBuildNumber)
  const seed = toAppBuild(bcsc?.lastSeenAppVersion, bcsc?.lastSeenAppBuildNumber) ?? registeredBuild
  const appBuildHistory = bcsc?.appBuildHistory?.length ? bcsc.appBuildHistory : seed ? [seed] : []
  return { registeredBuild, appBuildHistory }
}

const readLoose = async <T>(ctx: MigrationContext, key: LegacyAsyncKey, schema: z.ZodType<T>) => {
  const read = await ctx.legacy.async(key)
  if (read.status === 'corrupt') {
    ctx.log('migration.legacy-corrupt', { key })
  }
  if (read.status !== 'ok') {
    return undefined
  }
  const parsed = schema.safeParse(read.value)
  if (!parsed.success) {
    ctx.log('migration.legacy-shape', { key })
  }
  return parsed.data
}

// Today's load-time rules for the blob (migrateBCSCState), then the v3 rule from useInitializeAccountStatus:
// a native account with no answer belongs to a v3 upgrade, and v3 had no skip, so verification has started
export const verifyPromptState = (bcsc: LegacyBCSCState | undefined, hasNativeAccount: boolean) => {
  let { verificationSkipped, verificationStarted } = bcsc ?? {}
  if (bcsc?.hasAccount === true && verificationSkipped === undefined) {
    verificationSkipped = true
  }
  if (bcsc?.hasAccount === true && verificationStarted === undefined) {
    verificationStarted = verificationSkipped === false
  }
  if (verificationSkipped === undefined && hasNativeAccount) {
    return { verificationSkipped: false, verificationStarted: true }
  }
  return { verificationSkipped, verificationStarted }
}

// Frozen copy of hydrateCardProcess in useSecureActions
const cardProcessOf = (native: LegacySnapshot) => {
  const request = native.authorizationRequest.status === 'ok' ? native.authorizationRequest.value : undefined
  if (!request) {
    return undefined
  }
  if (request.cardProcess) {
    return request.cardProcess
  }
  const evidence = native.evidence.status === 'ok' ? native.evidence.value : []
  if (!request.deviceCode && evidence.length > 0) {
    return 'IDIM L3 Remote Non-BCSC Identity Verification'
  }
  return undefined
}

const definedOnly = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>

export const m0001: Migration = {
  version: 1,
  id: 'leave-bifold',

  async up(ctx) {
    const native = await ctx.legacy.native()
    if (native.account.status === 'unreadable' || native.account.status === 'locked') {
      throw new LegacyNotReadyError('account', native.account.status)
    }
    const account = native.account.status === 'ok' ? native.account.value : undefined
    const flags = native.accountFlags.status === 'ok' ? native.accountFlags.value : undefined

    const prefs = await readLoose(ctx, 'PreferencesState', LegacyPreferences)
    const bcsc = await readLoose(ctx, 'BCSC', LegacyBCSC)
    const { alternateContactNames, theme, ...plainPrefs } = prefs ?? {}

    await ctx.put('plain', 'preferences', {
      ...PREFERENCES_V1,
      ...definedOnly(plainPrefs),
      ...definedOnly({
        reconciledMediatorUrl: await readLoose(ctx, 'MediatorUrl', z.string()),
        userDeniedPushNotifications: await readLoose(ctx, 'userDeniedPushNotifications', z.boolean()),
      }),
    })

    await ctx.put(
      'plain',
      'app',
      definedOnly({
        installId: bcsc?.installId ?? bcsc?.reportUUID,
        ...appBuilds(bcsc),
        lastKeyRotationAttemptAt: bcsc?.lastKeyRotationAttemptAt,
        analyticsOptIn: bcsc?.analyticsOptIn ?? false,
        acceptedTermsOfUseVersion: bcsc?.acceptedTermsOfUseVersion,
        hasSeenOnboardingIntro: bcsc?.hasSeenOnboardingIntro,
        accountSetupType: bcsc?.accountSetupType,
        hasDismissedThirdPartyKeyboardAlert: bcsc?.hasDismissedThirdPartyKeyboardAlert,
        // D2: dismissed if either copy says so
        hasDismissedDeviceAuthInfo:
          bcsc?.hasDismissedDeviceAuthInfo || flags?.notShowDeviceAuthenticationPrepAgain ? true : undefined,
        ...verifyPromptState(bcsc, account !== undefined),
        dismissedBanners: bcsc?.dismissedBanners,
        deviceToken: await readLoose(ctx, 'deviceToken', z.string()),
      })
    )

    const environment = await readLoose(ctx, 'Environment', LegacyEnvironment)
    const remoteDebugging = await readLoose(ctx, 'RemoteDebugging', LegacyRemoteDebugging)
    const developer = definedOnly({
      environment,
      remoteDebugging: remoteDebugging ? definedOnly(remoteDebugging) : undefined,
      enableProxy: await readLoose(ctx, 'EnableProxy', z.boolean()),
      enableAppToAppPersonFlow: await readLoose(ctx, 'EnableAppToAppPersonFlow', z.boolean()),
      enableAttestation: await readLoose(ctx, 'EnableAttestation', z.boolean()),
      theme,
    })
    // Only what was stored is copied: the defaults depend on the build, and fill the rest when the slice loads
    if (Object.keys(developer).length > 0) {
      await ctx.put('plain', 'developer', developer)
    }

    await ctx.put('encrypted', 'contacts', {
      pinned: (await readLoose(ctx, 'PinnedContacts', z.array(z.string()))) ?? [],
      alternateNames: alternateContactNames ?? {},
    })
    if (bcsc?.credentialMetadata) {
      await ctx.put('encrypted', 'account/credentialMetadata', bcsc.credentialMetadata)
    }
    const cardProcess = cardProcessOf(native)
    if (cardProcess) {
      await ctx.put('encrypted', 'verification/cardProcess', cardProcess)
    }
    const pinAttempts = await readLoose(ctx, 'PinAttempts', LegacyPinAttempts)
    if (pinAttempts) {
      await ctx.put('plain', 'account/pinAttempts', {
        failedCount: pinAttempts.failedCount,
        lastAttemptAt: pinAttempts.lastAttemptAt,
      })
    }

    // Copied as-is so the first launch after upgrade keeps the JWK fallback; the readers check the shape
    const jwk = await readLoose(ctx, 'CachedJWK', z.unknown())
    if (jwk) {
      await ctx.put('plain', 'caches/jwk', jwk)
    }
    const genesis = await readLoose(ctx, 'GenesisTransactions', z.unknown())
    if (genesis) {
      await ctx.put('plain', 'caches/genesis', genesis)
    }
  },

  // Every failure is collected, so the log names them all
  async verify(ctx) {
    const failed: string[] = []
    const bcsc = await readLoose(ctx, 'BCSC', LegacyBCSC)
    const app = AppV1.safeParse(await ctx.read('plain', 'app'))
    const installId = bcsc?.installId ?? bcsc?.reportUUID
    if (!app.success) {
      failed.push('app')
    } else {
      if (installId && app.data.installId !== installId) {
        failed.push('app.installId')
      }
      if (bcsc?.verificationSkipped !== undefined && app.data.verificationSkipped !== bcsc.verificationSkipped) {
        failed.push('app.verificationSkipped')
      }
    }
    if (bcsc?.credentialMetadata && !(await ctx.read('encrypted', 'account/credentialMetadata'))) {
      failed.push('account.credentialMetadata')
    }
    if (!ContactsV1.safeParse(await ctx.read('encrypted', 'contacts')).success) {
      failed.push('contacts')
    }
    if (!(await ctx.read('plain', 'preferences'))) {
      failed.push('preferences')
    }
    if (failed.length > 0) {
      throw new VerifyError(failed)
    }
  },
}
