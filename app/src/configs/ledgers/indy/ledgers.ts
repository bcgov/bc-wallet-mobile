import { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'

import _ledgers from './ledgers.json'

const filePersistedLedgers: IndyVdrPoolConfig[] = _ledgers ?? []

export default filePersistedLedgers
