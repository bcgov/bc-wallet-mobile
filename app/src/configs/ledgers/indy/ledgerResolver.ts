import { Config } from 'react-native-config'

import filePersistedLedgers from './ledgers'
import { RemoteLedgerResolver } from './RemoteLedgerResolver'

export const ledgerResolver = new RemoteLedgerResolver(Config.LEDGER_URL ?? '', filePersistedLedgers)
