import { AccountSetupType, BCSCState } from '@/store'
import type { BifoldLogger } from '@bifold/core'
import { BannerType } from '@bcwallet-theme/theme'
import { z } from 'zod'

export type PersistedBCSCState = Partial<BCSCState> & { reportUUID?: string }

const BANNER_TYPES: [BannerType, ...BannerType[]] = ['error', 'warning', 'info', 'success']

// Bounded to BCLocalStorageKeys.BCSC (#3581): the only BC-owned stored value with a versioned,
// multi-field shape. Requires only the fields the app reads non-defensively; everything else is
// optional and unknown keys pass through untouched (loose, not strict).
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
  credentialMetadata: z
    .looseObject({
      fullName: z.string(),
      bcscReason: z.string(),
      deviceCount: z.number(),
      deviceLimit: z.number(),
      cardType: z.string(),
      lastUpdated: z.number(),
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
 * Validates a persisted BCSC state blob on load (#3581). Never throws — a corrupt or mismatched
 * top-level field is dropped (logging its path + Zod issue code only, never the value) so the
 * caller's `{ ...initialState.bcsc, ...state }` spread restores that field's in-memory default.
 * The app must never refuse to start over a bad persisted blob.
 *
 * @returns the sanitized state plus the top-level keys that were dropped, so the caller can
 *   distinguish "field is malformed" from "field predates this version" when applying migrations.
 */
export const sanitizePersistedBCSCState = (raw: unknown, logger: BifoldLogger): SanitizedPersistedBCSCState => {
  const result = persistedBCSCStateSchema.safeParse(raw)

  if (result.success) {
    // No transforms in this schema, so result.data is structurally identical to raw. The cast is
    // needed regardless: bannerMessages[].id is z.string() here (avoiding a BCSCBanner enum import
    // in tests), while BCSCBannerMessage.id is the BCSCBanner enum.
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
