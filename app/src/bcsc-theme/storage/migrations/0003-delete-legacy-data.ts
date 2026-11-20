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
    for (const key of OWNED_V0) {
      if ((await legacy.async(key)).status !== 'absent') {
        throw new VerifyError(`async.${key}`)
      }
    }
    const snapshot = await legacy.native()
    const left = Object.entries(snapshot).filter(([, record]) => record.status !== 'absent')
    if (left.length > 0) {
      throw new VerifyError(`native.${left.map(([name]) => name).join(',')}`)
    }
  },
}
