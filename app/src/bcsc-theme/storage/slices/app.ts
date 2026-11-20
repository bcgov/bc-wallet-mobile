import { addNewBuildToHistory, type AppBuild, isAppBuildEqual } from '@/utils/app-build'
import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

export const AccountSetupTypeSchema = z.enum(['AddAccount', 'TransferAccount'])

const AppBuildSchema = z.object({ version: z.string(), build: z.string() })

export const AppSchema = z.object({
  installId: z.string().optional(),
  // Builds this install has launched, newest first; recorded at startup
  appBuildHistory: z.array(AppBuildSchema),
  // The build last registered with IAS, set after a successful registration update
  registeredBuild: AppBuildSchema.optional(),
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
  appBuildHistory: [],
  analyticsOptIn: false,
}

// Blocks on unreadable: falling back would change the install ID and the verify-prompt answer
export const APP_KEY = persistedKey({ key: 'app', schema: AppSchema, backend: 'plain', initial: DEFAULT_APP })

export interface AppSlice {
  app: AppState & {
    update(patch: Partial<AppState>): Promise<void>
    dismissBanner(id: string, dismissedAt?: number): Promise<void>
    // Adds the running build to the history when it differs from the newest one
    recordBuild(build: AppBuild): Promise<void>
    // After a successful registration update
    setRegisteredBuild(build: AppBuild): Promise<void>
    // Factory reset: back to a new install's state, keeping the install ID and build history
    clear(): Promise<void>
  }
}

export const createAppSlice =
  ({ persist }: SliceContext): BCSCSlice<AppSlice> =>
  (_set, get) => ({
    app: {
      ...APP_KEY.initial,
      update: (patch) => persist.update(APP_KEY, (app) => ({ ...app, ...patch })),
      recordBuild: async (build) => {
        const { history, added } = addNewBuildToHistory(build, get().app.appBuildHistory)
        if (added) {
          await persist.update(APP_KEY, (app) => ({ ...app, appBuildHistory: history }))
        }
      },
      setRegisteredBuild: async (build) => {
        if (!isAppBuildEqual(get().app.registeredBuild, build)) {
          await persist.update(APP_KEY, (app) => ({ ...app, registeredBuild: build }))
        }
      },
      // Like the install ID, the build history belongs to the install, not the account
      clear: () =>
        persist.update(APP_KEY, (app) => ({
          ...DEFAULT_APP,
          installId: app.installId,
          appBuildHistory: app.appBuildHistory,
        })),
      dismissBanner: (id, dismissedAt = Date.now()) =>
        persist.update(APP_KEY, (app) => ({
          ...app,
          dismissedBanners: { ...app.dismissedBanners, [id]: { dismissedAt } },
        })),
    },
  })
