// Named keys only. Never getAllKeys: other libraries share this namespace.
export const LEGACY_ASYNC_KEYS = [
  'PreferencesState',
  'BCSC',
  'Environment',
  'RemoteDebugging',
  'EnableProxy',
  'EnableAppToAppPersonFlow',
  'EnableAttestation',
  'MediatorUrl',
  'PinnedContacts',
  'GenesisTransactions',
  'CachedJWK',
  'remoteConfigCache',
  'PinAttempts',
  'userDeniedPushNotifications',
  'deviceToken',
  'Mode',
] as const
export type LegacyAsyncKey = (typeof LEGACY_ASYNC_KEYS)[number]

export type LegacyRead = { status: 'ok'; value: unknown } | { status: 'absent' } | { status: 'corrupt' }

export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>
  removeItem(key: string): Promise<void>
}

export const createLegacyAsyncReader =
  (asyncStorage: AsyncStorageLike) =>
  async (key: LegacyAsyncKey): Promise<LegacyRead> => {
    const raw = await asyncStorage.getItem(key)
    if (raw === null) {
      return { status: 'absent' }
    }
    try {
      return { status: 'ok', value: JSON.parse(raw) }
    } catch {
      return { status: 'corrupt' }
    }
  }

// wipe() removes these so a reset device reads as fresh. PreferencesState is included: in the BCSC app nothing
// reads it once Bifold's store is gone, and it holds contact names.
export const BCSC_OWNED_ASYNC_KEYS: readonly LegacyAsyncKey[] = LEGACY_ASYNC_KEYS
