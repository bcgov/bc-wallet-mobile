import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

export const AccountSetupTypeSchema = z.enum(['AddAccount', 'TransferAccount'])

export const AppSchema = z.object({
  installId: z.string().optional(),
  // Advanced only by a successful device-registration update
  appVersion: z.string(),
  appBuildNumber: z.string(),
  lastSeenAppVersion: z.string().optional(),
  lastSeenAppBuildNumber: z.string().optional(),
  lastKeyRotationAttemptAt: z.string().optional(),
  analyticsOptIn: z.boolean(),
  acceptedTermsOfUseVersion: z.string().optional(),
  hasSeenOnboardingIntro: z.boolean().optional(),
  accountSetupType: AccountSetupTypeSchema.optional(),
  hasDismissedThirdPartyKeyboardAlert: z.boolean().optional(),
  hasDismissedDeviceAuthInfo: z.boolean().optional(),
  verificationSkipped: z.boolean().optional(),
  verificationStarted: z.boolean().optional(),
  dismissedBanners: z.record(z.string(), z.object({ dismissedAt: z.number() })).optional(),
  deviceToken: z.string().optional(),
})
export type AppState = z.infer<typeof AppSchema>

export const DEFAULT_APP: AppState = {
  appVersion: '',
  appBuildNumber: '',
  analyticsOptIn: false,
}

// Blocks on unreadable: falling back would change the install ID and the verify-prompt answer
export const APP_KEY = persistedKey({ key: 'app', schema: AppSchema, backend: 'plain', initial: DEFAULT_APP })

export interface AppSlice {
  app: AppState & {
    update(patch: Partial<AppState>): Promise<void>
    dismissBanner(id: string, dismissedAt?: number): Promise<void>
    // Factory reset: back to a new install's state, keeping the install ID
    clear(): Promise<void>
  }
}

export const createAppSlice =
  ({ persist }: SliceContext): BCSCSlice<AppSlice> =>
  () => ({
    app: {
      ...APP_KEY.initial,
      update: (patch) => persist.update(APP_KEY, (app) => ({ ...app, ...patch })),
      clear: () => persist.update(APP_KEY, (app) => ({ ...DEFAULT_APP, installId: app.installId })),
      dismissBanner: (id, dismissedAt = Date.now()) =>
        persist.update(APP_KEY, (app) => ({
          ...app,
          dismissedBanners: { ...app.dismissedBanners, [id]: { dismissedAt } },
        })),
    },
  })
