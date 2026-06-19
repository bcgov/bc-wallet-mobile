import { BifoldLogger, FileCache } from '@bifold/core'
import { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'

import { LedgerSource } from './ledger-sources'

const ledgerCacheStorageDirectory = 'ledgers'
const ledgerCacheDataFileName = 'ledger-cache.json'

interface LedgerCacheData {
  etags: Record<string, string>
  updatedAt: string
}

export class RemoteLedgerResolver extends FileCache {
  public readonly remoteEnabled: boolean
  private ledgerData: IndyVdrPoolConfig[] | undefined
  private readonly sources: LedgerSource[]
  private readonly defaultLedgers: IndyVdrPoolConfig[]

  public constructor(
    sources: LedgerSource[],
    defaultLedgers: IndyVdrPoolConfig[],
    opts?: { remoteEnabled?: boolean; log?: BifoldLogger }
  ) {
    // No base URL — each source carries its own absolute genesis URL
    super('', ledgerCacheStorageDirectory, ledgerCacheDataFileName, opts?.log)
    this.sources = sources
    this.defaultLedgers = defaultLedgers
    this.remoteEnabled = (opts?.remoteEnabled ?? true) && sources.length > 0
  }

  public set logger(log: BifoldLogger) {
    this.log = log
  }

  public get ledgers(): IndyVdrPoolConfig[] {
    return this.ledgerData ?? this.defaultLedgers
  }

  public async checkForUpdates(): Promise<void> {
    if (!this.remoteEnabled) {
      return
    }

    await this.createWorkingDirectoryIfNotExists()

    const etags = await this.loadEtagMap()
    const results = await Promise.all(this.sources.map((source) => this.resolveGenesis(source, etags)))
    const resolved = results.filter((entry): entry is IndyVdrPoolConfig => entry !== undefined)

    if (resolved.length > 0) {
      this.ledgerData = resolved
    }

    await this.saveEtagMap(etags)
  }

  private genesisFileName = (indyNamespace: string): string => `${indyNamespace.replace(/:/g, '-')}.genesis`

  private loadEtagMap = async (): Promise<Record<string, string>> => {
    const data = await this.loadFileFromLocalStorage(ledgerCacheDataFileName)
    if (!data) {
      return {}
    }

    try {
      const cacheData: LedgerCacheData = JSON.parse(data)
      return cacheData.etags ?? {}
    } catch {
      this.log?.warn('Ledger cache data is corrupt, starting fresh')
      return {}
    }
  }

  private saveEtagMap = async (etags: Record<string, string>): Promise<void> => {
    const cacheData: LedgerCacheData = { etags, updatedAt: new Date().toISOString() }
    await this.saveFileToLocalStorage(ledgerCacheDataFileName, JSON.stringify(cacheData))
  }

  /**
   * Resolve one network's genesis transactions: remote fetch → cached file →
   * bundled default → omit. Mutates `etags` with the latest ETag on fetch.
   */
  private resolveGenesis = async (
    source: LedgerSource,
    etags: Record<string, string>
  ): Promise<IndyVdrPoolConfig | undefined> => {
    const fileName = this.genesisFileName(source.indyNamespace)
    const storedEtag = etags[source.indyNamespace]
    let genesisTransactions: string | undefined

    try {
      // Conditional GET: when we hold an ETag, let the server answer 304 so an
      // unchanged genesis file isn't re-downloaded on every startup. The base
      // axios instance rejects non-2xx by default, so allow 304 through here.
      const response = await this.axiosInstance.get(source.genesisUrl, {
        ...(storedEtag && { headers: { 'If-None-Match': storedEtag } }),
        validateStatus: (status) => status === 200 || status === 304,
      })
      const { status, headers, data } = response

      if (status === 304) {
        // Cached copy is current — fall through to load it from local storage.
        this.log?.info(`Genesis for ${source.indyNamespace} unchanged (304)`)
      } else {
        const body = typeof data === 'string' ? data : JSON.stringify(data)

        // Every line of a genesis file is a JSON transaction — guards against
        // moved-file/HTML responses served with a 200.
        JSON.parse(body.split('\n', 1)[0])

        const etag = headers.etag
        if (etag && storedEtag && this.compareWeakEtags(storedEtag, etag)) {
          this.log?.info(`Genesis for ${source.indyNamespace} unchanged (ETag match)`)
        } else {
          await this.saveFileToLocalStorage(fileName, body)
          if (etag) {
            etags[source.indyNamespace] = etag
          }
          this.log?.info(`Fetched genesis for ${source.indyNamespace}`)
        }
        genesisTransactions = body
      }
    } catch (error) {
      this.log?.error(`Failed to fetch genesis for ${source.indyNamespace}: ${error}`)
    }

    if (!genesisTransactions) {
      genesisTransactions = await this.loadFileFromLocalStorage(fileName)
      if (genesisTransactions) {
        this.log?.info(`Using cached genesis for ${source.indyNamespace}`)
      }
    }

    if (!genesisTransactions) {
      const bundled = this.defaultLedgers.find((ledger) => ledger.indyNamespace === source.indyNamespace)
      if (!bundled) {
        this.log?.warn(`No genesis available for ${source.indyNamespace} (no fetch, cache, or bundled entry), omitting`)
        return undefined
      }
      this.log?.info(`Using bundled genesis for ${source.indyNamespace}`)
      genesisTransactions = bundled.genesisTransactions
    }

    const config: IndyVdrPoolConfig & { id: string } = {
      id: source.id ?? source.indyNamespace,
      indyNamespace: source.indyNamespace,
      isProduction: source.isProduction ?? false,
      connectOnStartup: source.connectOnStartup ?? true,
      genesisTransactions,
      ...(source.transactionAuthorAgreement && { transactionAuthorAgreement: source.transactionAuthorAgreement }),
    }

    return config
  }
}
