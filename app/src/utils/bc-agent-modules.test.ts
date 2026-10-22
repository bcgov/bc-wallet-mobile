import { CacheModule, InMemoryLruCache, SingleContextStorageLruCache } from '@credo-ts/core'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'

import { getBCAgentModules } from './bc-agent-modules'

jest.mock('@hyperledger/indy-vdr-react-native', () => ({ indyVdr: { setLedgerTxnCache: jest.fn() } }))

const baseOptions = {
  walletId: 'bc-wallet-bcsc',
  walletKey: 'test-key',
  indyNetworks: [],
  mediatorInvitationUrl: 'https://mediator.example',
  enableProxy: false,
}

describe('getBCAgentModules', () => {
  it('registers an in-memory cache instead of the default storage-backed cache', () => {
    const modules = getBCAgentModules(baseOptions)

    // The fix: register our own `cache` key so Credo does not fall back to the
    // storage-backed SingleContextStorageLruCache (the source of the concurrent
    // "Duplicate entry" Askar writes during init).
    expect(modules.cache).toBeInstanceOf(CacheModule)
    expect(modules.cache.config.cache).toBeInstanceOf(InMemoryLruCache)
    expect(modules.cache.config.cache).not.toBeInstanceOf(SingleContextStorageLruCache)
  })

  it('keeps the in-memory cache when the Indy VDR proxy is enabled', () => {
    const modules = getBCAgentModules({
      ...baseOptions,
      enableProxy: true,
      proxyBaseUrl: 'https://proxy.example',
    })

    // The proxy branch reassigns only anoncreds/dids — the cache override must survive.
    expect(modules.cache).toBeInstanceOf(CacheModule)
    expect(modules.cache.config.cache).toBeInstanceOf(InMemoryLruCache)
  })

  it('configures the ledger transaction cache without a disk path', () => {
    getBCAgentModules({ ...baseOptions, txnCache: { capacity: 1000, expiryOffsetMs: 60_000 } })

    const [options] = jest.mocked(indyVdr.setLedgerTxnCache).mock.calls[0]
    expect(options).toEqual({ capacity: 1000, expiry_offset_ms: 60_000 })
    expect(options).not.toHaveProperty('path')
  })
})
