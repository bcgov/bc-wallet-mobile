import { CacheModule, InMemoryLruCache, SingleContextStorageLruCache } from '@credo-ts/core'

import { getBCAgentModules } from './bc-agent-modules'

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
})
