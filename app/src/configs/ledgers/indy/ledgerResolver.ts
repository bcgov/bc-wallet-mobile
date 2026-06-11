import { Config } from 'react-native-config'

import filePersistedLedgers from './ledgers'
import { RemoteLedgerResolver } from './RemoteLedgerResolver'

// Axios resolves relative paths against the last '/' in the base URL, so a
// directory URL without a trailing slash would drop its final path segment.
// Keep '' as-is — it disables remote fetching in checkForUpdates.
const baseUrl = Config.LEDGER_URL ? Config.LEDGER_URL.replace(/\/?$/, '/') : ''

export const ledgerResolver = new RemoteLedgerResolver(baseUrl, filePersistedLedgers)
