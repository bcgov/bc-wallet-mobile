import { reconcileMediatorPreferences } from '@/utils/mediator-preferences'
import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

export const PreferencesSchema = z.object({
  autoLockTime: z.number(),
  developerModeEnabled: z.boolean(),
  usePushNotifications: z.boolean(),
  userDeniedPushNotifications: z.boolean().optional(),
  selectedMediator: z.string(),
  availableMediators: z.array(z.string()),
  // The MEDIATOR_URL the mediator preferences were last reconciled with
  reconciledMediatorUrl: z.string().optional(),
  proofRequestExpirationMs: z.number(),
  walletName: z.string().optional(),
})
export type Preferences = z.infer<typeof PreferencesSchema>

export const DEFAULT_PREFERENCES: Preferences = {
  autoLockTime: 5,
  developerModeEnabled: false,
  usePushNotifications: false,
  selectedMediator: '',
  availableMediators: [],
  proofRequestExpirationMs: 48 * 60 * 60 * 1000,
}

// One stored value for the whole slice, so its fields sit directly on state.preferences
export const PREFERENCES_KEY = persistedKey({
  key: 'preferences',
  schema: PreferencesSchema,
  backend: 'plain',
  initial: DEFAULT_PREFERENCES,
  onUnreadable: 'initial',
})

export interface PreferencesSlice {
  preferences: Preferences & {
    update(patch: Partial<Preferences>): Promise<void>
    setAutoLockTime(time: number): Promise<void>
    setDeveloperMode(enabled: boolean): Promise<void>
    setUsePushNotifications(enabled: boolean): Promise<void>
    setProofRequestExpiration(ms: number): Promise<void>
    selectMediator(url: string): Promise<void>
    addMediator(url: string): Promise<void>
    removeMediator(url: string): Promise<void>
    // A new MEDIATOR_URL replaces the previous default; an unchanged one keeps a mediator picked in developer mode
    reconcileMediator(mediatorUrl: string | undefined): Promise<void>
  }
}

export const createPreferencesSlice =
  ({ persist }: SliceContext): BCSCSlice<PreferencesSlice> =>
  (_set, get) => ({
    preferences: {
      ...PREFERENCES_KEY.initial,
      update: (patch) => persist.update(PREFERENCES_KEY, (p) => ({ ...p, ...patch })),
      setAutoLockTime: (time) => persist.update(PREFERENCES_KEY, (p) => ({ ...p, autoLockTime: time })),
      setDeveloperMode: (enabled) => persist.update(PREFERENCES_KEY, (p) => ({ ...p, developerModeEnabled: enabled })),
      setUsePushNotifications: (enabled) =>
        persist.update(PREFERENCES_KEY, (p) => ({ ...p, usePushNotifications: enabled })),
      setProofRequestExpiration: (ms) =>
        persist.update(PREFERENCES_KEY, (p) => ({ ...p, proofRequestExpirationMs: ms })),
      selectMediator: (url) => persist.update(PREFERENCES_KEY, (p) => ({ ...p, selectedMediator: url })),
      addMediator: (url) =>
        persist.update(PREFERENCES_KEY, (p) => ({
          ...p,
          availableMediators: p.availableMediators.includes(url)
            ? p.availableMediators
            : [...p.availableMediators, url],
        })),
      removeMediator: (url) =>
        persist.update(PREFERENCES_KEY, (p) => ({
          ...p,
          availableMediators: p.availableMediators.filter((available) => available !== url),
        })),
      // One write: the preferences and the URL they were reconciled with live in the same key
      reconcileMediator: async (mediatorUrl) => {
        const { reconciledMediatorUrl, selectedMediator, availableMediators } = get().preferences
        if (!mediatorUrl) {
          return
        }
        const result = reconcileMediatorPreferences(
          { selectedMediator, availableMediators },
          mediatorUrl,
          reconciledMediatorUrl
        )
        await persist.update(PREFERENCES_KEY, (p) => ({
          ...p,
          ...result.preferences,
          reconciledMediatorUrl: result.mediatorUrlToRecord ?? reconciledMediatorUrl,
        }))
      },
    },
  })
