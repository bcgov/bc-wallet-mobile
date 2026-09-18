import { AccountSetupType, BCSCState } from '@/store'
import { BannerType } from '@bcwallet-theme/theme'
import type { BifoldLogger } from '@bifold/core'
import { z } from 'zod'

export type PersistedBCSCState = Partial<BCSCState> & { reportUUID?: string }

const BANNER_TYPES: [BannerType, ...BannerType[]] = ['error', 'warning', 'info', 'success']

// Every field optional and unknown keys pass through (#3581): only the type of a present field is
// checked, so blobs from earlier app versions still load.
const persistedBCSCStateSchema = z.looseObject({
  appVersion: z.string().optional(),
  appBuildNumber: z.string().optional(),
  hasAccount: z.boolean().optional(),
  selectedNickname: z.string().optional(),
  // AppBanner passes title/description to a11yLabel (.replaceAll) — a non-string crashes render.
  bannerMessages: z
    .array(
      z.looseObject({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        type: z.enum(BANNER_TYPES),
        dismissible: z.boolean().optional(),
      })
    )
    .optional(),
  analyticsOptIn: z.boolean().optional(),
  accountSetupType: z.enum(AccountSetupType).optional(),
  hasDismissedExpiryAlert: z.boolean().optional(),
  hasDismissedThirdPartyKeyboardAlert: z.boolean().optional(),
  hasDismissedDeviceAuthInfo: z.boolean().optional(),
  deviceLimitBannerDismissedAt: z.string().optional(),
  // Nested fields optional too: cardType/bcscReason are conditional server claims (#3581 review).
  credentialMetadata: z
    .looseObject({
      fullName: z.string().optional(),
      bcscReason: z.string().optional(),
      deviceCount: z.number().optional(),
      deviceLimit: z.number().optional(),
      cardType: z.string().optional(),
      lastUpdated: z.number().optional(),
    })
    .optional(),
  hasSeenOnboardingIntro: z.boolean().optional(),
  acceptedTermsOfUseVersion: z.string().optional(),
  installId: z.string().optional(),
  lastKeyRotationAttemptAt: z.string().optional(),
  lastSeenAppVersion: z.string().optional(),
  lastSeenAppBuildNumber: z.string().optional(),
  verificationSkipped: z.boolean().optional(),
  // Legacy (<= v4.0.2); consumed by migrateBCSCState, so a non-string can never become installId.
  reportUUID: z.string().optional(),
})

export type SanitizedPersistedBCSCState = {
  state: PersistedBCSCState
  rejectedKeys: (keyof PersistedBCSCState)[]
}

/**
 * Validates a persisted BCSC state blob on load (#3581). Never throws: a mismatched top-level field is
 * dropped (logging only its path and Zod issue code) so the caller's spread restores its default.
 *
 * @returns the sanitized state plus the dropped top-level keys, so the caller can tell "malformed"
 *   from "predates this version" when applying migrations.
 */
export const sanitizePersistedBCSCState = (raw: unknown, logger: BifoldLogger): SanitizedPersistedBCSCState => {
  const result = persistedBCSCStateSchema.safeParse(raw)

  if (result.success) {
    // Cast, not result.data: the schema has no transforms, and bannerMessages[].id is a plain string
    // here where BCSCBannerMessage.id is the BCSCBanner enum.
    return { state: raw as PersistedBCSCState, rejectedKeys: [] }
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    logger.warn('[PersistedBCSCState] Persisted BCSC state was not an object; using in-memory defaults', {
      path: '',
      code: result.error.issues[0]?.code,
    })
    return { state: {}, rejectedKeys: [] }
  }

  const rejectedKeys = new Set<keyof PersistedBCSCState>()
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join('.')
    logger.warn('[PersistedBCSCState] Field failed validation; using in-memory default', {
      path,
      code: issue.code,
    })

    const topLevelKey = issue.path[0]
    if (typeof topLevelKey === 'string') {
      rejectedKeys.add(topLevelKey as keyof PersistedBCSCState)
    }
  }

  const state = { ...(raw as Record<string, unknown>) }
  for (const key of rejectedKeys) {
    delete state[key as string]
  }

  return { state: state as PersistedBCSCState, rejectedKeys: [...rejectedKeys] }
}
