import { Config } from 'react-native-config'

import { ledgerSources } from './ledger-sources'
import filePersistedLedgers from './ledgers'
import { RemoteLedgerResolver } from './RemoteLedgerResolver'

// Genesis auto-update is on unless explicitly disabled
const remoteEnabled = Config.LEDGER_AUTO_UPDATE !== 'false'

export const ledgerResolver = new RemoteLedgerResolver(ledgerSources, filePersistedLedgers, { remoteEnabled })
