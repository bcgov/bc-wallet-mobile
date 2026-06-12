import { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'

export interface LedgerSource {
  /** Indy namespace, e.g. 'bcovrin:test' */
  indyNamespace: string
  /** URL of the official pool_transactions_genesis file for this network */
  genesisUrl: string
  /** Display identifier — defaults to indyNamespace */
  id?: string
  /** Defaults to false */
  isProduction?: boolean
  /** Defaults to true */
  connectOnStartup?: boolean
  transactionAuthorAgreement?: IndyVdrPoolConfig['transactionAuthorAgreement']
}

/**
 * Official genesis transaction sources, fetched at startup by
 * RemoteLedgerResolver. The bundled ledgers.json remains the offline
 * fallback when a network has never been fetched successfully.
 */
export const ledgerSources: LedgerSource[] = [
  {
    id: 'BCovrinTest',
    indyNamespace: 'bcovrin:test',
    genesisUrl: 'https://raw.githubusercontent.com/bcgov/von-network/refs/heads/main/BCovrin/genesis_test',
  },
  {
    id: 'CANdyDevNetwork',
    indyNamespace: 'candy:dev',
    genesisUrl:
      'https://raw.githubusercontent.com/ICCS-ISAC/dtrust-reconu/refs/heads/main/CANdy/dev/pool_transactions_genesis',
  },
  {
    id: 'CANdyTestNetwork',
    indyNamespace: 'candy:test',
    genesisUrl:
      'https://raw.githubusercontent.com/ICCS-ISAC/dtrust-reconu/refs/heads/main/CANdy/test/pool_transactions_genesis',
  },
  {
    id: 'CANdyProductionNetwork',
    indyNamespace: 'candy',
    genesisUrl:
      'https://raw.githubusercontent.com/ICCS-ISAC/dtrust-reconu/refs/heads/main/CANdy/prod/pool_transactions_genesis',
    isProduction: true,
  },
]
