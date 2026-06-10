import { FileCache, BifoldLogger } from '@bifold/core'
import { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'

const ledgerCacheStorageDirectory = 'ledgers'
const ledgerCacheDataFileName = 'ledger-cache.json'
const ledgerIndexFileName = 'ledgers.json'

export class RemoteLedgerResolver extends FileCache {
  private ledgerData: IndyVdrPoolConfig[] | undefined
  private readonly defaultLedgers: IndyVdrPoolConfig[]

  public constructor(indexFileBaseUrl: string, defaultLedgers: IndyVdrPoolConfig[], log?: BifoldLogger) {
    super(indexFileBaseUrl, ledgerCacheStorageDirectory, ledgerCacheDataFileName, log)
    this.defaultLedgers = defaultLedgers
  }

  public set logger(log: BifoldLogger) {
    this.log = log
  }

  public get ledgers(): IndyVdrPoolConfig[] {
    return this.ledgerData ?? this.defaultLedgers
  }

  public async checkForUpdates(): Promise<void> {
    if (!this.axiosInstance.defaults.baseURL) {
      return
    }

    await this.createWorkingDirectoryIfNotExists()

    if (!this.fileEtag) {
      const cacheData = await this.loadCacheData()
      if (cacheData) {
        this.fileEtag = cacheData.fileEtag
      }
    }

    await this.loadLedgerIndex(ledgerIndexFileName)
  }

  private loadLedgerIndex = async (filePath: string): Promise<void> => {
    let remoteFetchSucceeded = false
    try {
      const response = await this.axiosInstance.get(filePath)
      const { status } = response
      const { etag } = response.headers

      if (status !== 200) {
        this.log?.error(`Failed to fetch remote ledger index at ${filePath}`)
        throw new Error('Failed to fetch remote ledger index')
      }

      if (etag && this.compareWeakEtags(this.fileEtag, etag)) {
        this.log?.info(`Ledger index ${filePath} has not changed, using cached`)
        this.ledgerData = response.data
        return
      }

      this.fileEtag = etag
      this.ledgerData = response.data
      remoteFetchSucceeded = true

      await this.saveFileToLocalStorage(filePath, JSON.stringify(this.ledgerData))
    } catch (error) {
      this.log?.error(`Failed to fetch remote ledger index ${filePath}: ${error}`)
    }

    if (remoteFetchSucceeded) {
      return
    }

    const data = await this.loadFileFromLocalStorage(filePath)
    if (!data) {
      this.log?.warn(`No cached ledger index found for ${filePath}, falling back to bundled default`)
      return
    }

    this.log?.info(`Using cached ledger index ${filePath}`)
    try {
      this.ledgerData = JSON.parse(data)
    } catch {
      this.log?.warn(`Cached ledger index ${filePath} is corrupt, falling back to bundled default`)
    }
  }
}
