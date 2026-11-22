import type { LegacyAsyncKey } from '../legacy/async-storage'
import { type Migration, VerifyError } from './types'

// Ships with m0001 and m0002 in the first release (a gradual rollout stands in for the releases between them)

// Frozen list of the AsyncStorage keys BCSC owned. Bifold's PreferencesState is left for wipe(): m0003 is
// about the data m0001 copied, and keeping it costs nothing.
const OWNED_V0: readonly LegacyAsyncKey[] = [
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
]

export const m0003: Migration = {
  version: 3,
  id: 'delete-legacy-data',

  async up({ legacy }) {
    await legacy.removeAsync(OWNED_V0)
    await legacy.removeNative()
  },

  async verify({ legacy }) {
    const reads = await Promise.all(OWNED_V0.map((key) => legacy.async(key)))
    const failed = OWNED_V0.filter((_, i) => reads[i].status !== 'absent').map((key) => `async.${key}`)
    const snapshot = await legacy.native()
    for (const [name, record] of Object.entries(snapshot)) {
      if (record.status !== 'absent') {
        failed.push(`native.${name}`)
      }
    }
    if (failed.length > 0) {
      throw new VerifyError(failed)
    }
  },
}
