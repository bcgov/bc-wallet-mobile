import { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'

import { LedgerSource } from './ledger-sources'
import { RemoteLedgerResolver } from './RemoteLedgerResolver'

const mockGet = jest.fn()
const mockFiles: Record<string, string> = {}

jest.mock('axios', () => ({
  create: jest.fn(() => ({ get: mockGet })),
}))

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/caches',
  exists: jest.fn(async (path: string) => path === '/caches/ledgers' || mockFiles[path] !== undefined),
  mkdir: jest.fn(async () => undefined),
  readFile: jest.fn(async (path: string) => {
    if (mockFiles[path] === undefined) {
      throw new Error(`ENOENT: ${path}`)
    }
    return mockFiles[path]
  }),
  writeFile: jest.fn(async (path: string, data: string) => {
    mockFiles[path] = data
  }),
}))

const GENESIS_A = '{"txn":"a1"}\n{"txn":"a2"}'
const GENESIS_B = '{"txn":"b1"}\n{"txn":"b2"}'

const sources: LedgerSource[] = [
  { id: 'BCovrinTest', indyNamespace: 'bcovrin:test', genesisUrl: 'https://official.example/bcovrin/genesis' },
  { indyNamespace: 'candy:dev', genesisUrl: 'https://official.example/candy-dev/genesis' },
]

const bundled: IndyVdrPoolConfig[] = [
  {
    indyNamespace: 'bcovrin:test',
    isProduction: false,
    connectOnStartup: true,
    genesisTransactions: 'bundled-bcovrin-genesis',
  },
]

const ok = (data: string, etag?: string) => ({ status: 200, headers: etag ? { etag } : {}, data })
const notModified = () => ({ status: 304, headers: {}, data: '' })

describe('RemoteLedgerResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(mockFiles)) {
      delete mockFiles[key]
    }
  })

  it('does nothing when remote is disabled', async () => {
    const resolver = new RemoteLedgerResolver(sources, bundled, { remoteEnabled: false })

    await resolver.checkForUpdates()

    expect(mockGet).not.toHaveBeenCalled()
    expect(resolver.remoteEnabled).toBe(false)
    expect(resolver.ledgers).toBe(bundled)
  })

  it('is disabled when there are no sources', () => {
    const resolver = new RemoteLedgerResolver([], bundled, { remoteEnabled: true })

    expect(resolver.remoteEnabled).toBe(false)
  })

  it('builds pool configs from fetched genesis files with defaults applied', async () => {
    mockGet.mockResolvedValueOnce(ok(GENESIS_A, '"etag-a"')).mockResolvedValueOnce(ok(GENESIS_B, '"etag-b"'))
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    expect(resolver.ledgers).toEqual([
      {
        id: 'BCovrinTest',
        indyNamespace: 'bcovrin:test',
        isProduction: false,
        connectOnStartup: true,
        genesisTransactions: GENESIS_A,
      },
      {
        // id defaults to the namespace when not specified
        id: 'candy:dev',
        indyNamespace: 'candy:dev',
        isProduction: false,
        connectOnStartup: true,
        genesisTransactions: GENESIS_B,
      },
    ])
    // genesis files cached per network, ':' replaced for the filename
    expect(mockFiles['/caches/ledgers/bcovrin-test.genesis']).toBe(GENESIS_A)
    expect(mockFiles['/caches/ledgers/candy-dev.genesis']).toBe(GENESIS_B)
    // ETags persisted
    expect(JSON.parse(mockFiles['/caches/ledgers/ledger-cache.json']).etags).toEqual({
      'bcovrin:test': '"etag-a"',
      'candy:dev': '"etag-b"',
    })
  })

  it('skips re-saving a genesis file when the ETag matches', async () => {
    mockFiles['/caches/ledgers/ledger-cache.json'] = JSON.stringify({
      etags: { 'bcovrin:test': 'W/"etag-a"', 'candy:dev': '"etag-b"' },
      updatedAt: 'whenever',
    })
    mockGet.mockResolvedValueOnce(ok(GENESIS_A, '"etag-a"')).mockResolvedValueOnce(ok(GENESIS_B, '"etag-b"'))
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    expect(mockFiles['/caches/ledgers/bcovrin-test.genesis']).toBeUndefined()
    expect(mockFiles['/caches/ledgers/candy-dev.genesis']).toBeUndefined()
    expect(resolver.ledgers.map((l) => l.genesisTransactions)).toEqual([GENESIS_A, GENESIS_B])
  })

  it('sends a conditional request and loads the cached genesis on a 304', async () => {
    mockFiles['/caches/ledgers/ledger-cache.json'] = JSON.stringify({
      etags: { 'bcovrin:test': '"etag-a"', 'candy:dev': '"etag-b"' },
      updatedAt: 'whenever',
    })
    mockFiles['/caches/ledgers/bcovrin-test.genesis'] = 'cached-bcovrin-genesis'
    mockFiles['/caches/ledgers/candy-dev.genesis'] = 'cached-candy-genesis'
    mockGet.mockResolvedValueOnce(notModified()).mockResolvedValueOnce(notModified())
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    // conditional GET issued with the stored ETag
    expect(mockGet).toHaveBeenCalledWith(
      'https://official.example/bcovrin/genesis',
      expect.objectContaining({ headers: { 'If-None-Match': '"etag-a"' } })
    )
    // unchanged genesis served from cache, not re-downloaded or rewritten
    expect(resolver.ledgers.map((l) => l.genesisTransactions)).toEqual([
      'cached-bcovrin-genesis',
      'cached-candy-genesis',
    ])
  })

  it('falls back to the cached genesis file when the fetch fails', async () => {
    mockFiles['/caches/ledgers/bcovrin-test.genesis'] = 'cached-bcovrin-genesis'
    mockGet.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(ok(GENESIS_B))
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    expect(resolver.ledgers.map((l) => l.genesisTransactions)).toEqual(['cached-bcovrin-genesis', GENESIS_B])
  })

  it('falls back to the bundled entry when fetch fails and no cache exists', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(ok(GENESIS_B))
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    expect(resolver.ledgers.map((l) => l.genesisTransactions)).toEqual(['bundled-bcovrin-genesis', GENESIS_B])
  })

  it('omits a network with no fetch, cache, or bundled entry', async () => {
    mockGet.mockResolvedValueOnce(ok(GENESIS_A)).mockRejectedValueOnce(new Error('network down'))
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    // candy:dev has no cached file and no bundled entry — dropped
    expect(resolver.ledgers.map((l) => l.indyNamespace)).toEqual(['bcovrin:test'])
  })

  it('keeps the bundled defaults when every network fails to resolve', async () => {
    mockGet.mockRejectedValue(new Error('network down'))
    const resolver = new RemoteLedgerResolver([sources[1]], bundled)

    await resolver.checkForUpdates()

    expect(resolver.ledgers).toBe(bundled)
  })

  it('treats a non-JSON 200 response as a failed fetch', async () => {
    mockGet.mockResolvedValueOnce(ok('<html>moved</html>')).mockResolvedValueOnce(ok(GENESIS_B))
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    expect(resolver.ledgers.map((l) => l.genesisTransactions)).toEqual(['bundled-bcovrin-genesis', GENESIS_B])
  })

  it('tolerates a corrupt ETag map', async () => {
    mockFiles['/caches/ledgers/ledger-cache.json'] = 'not-json'
    mockGet.mockResolvedValueOnce(ok(GENESIS_A, '"etag-a"')).mockResolvedValueOnce(ok(GENESIS_B))
    const resolver = new RemoteLedgerResolver(sources, bundled)

    await resolver.checkForUpdates()

    expect(resolver.ledgers.map((l) => l.genesisTransactions)).toEqual([GENESIS_A, GENESIS_B])
    expect(JSON.parse(mockFiles['/caches/ledgers/ledger-cache.json']).etags).toEqual({ 'bcovrin:test': '"etag-a"' })
  })
})
