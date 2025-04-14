import { checkVersion } from 'react-native-check-version'
import { VersionInfo, IVersionCheckService, BifoldLogger } from '@bifold/core'

export class VersionCheckService implements IVersionCheckService {
  private _cachedVersionInfo: VersionInfo | undefined

  constructor(private readonly log: BifoldLogger) {
    // Logger is now injected
  }

  get lastChecked(): Date | undefined {
    return this._cachedVersionInfo?.lastChecked
  }

  async checkForUpdate(forceCheck: boolean = false): Promise<VersionInfo | undefined> {
    if (forceCheck || !this._cachedVersionInfo) {
      try {
        const version = await checkVersion()
        const now = new Date()

        const versionInfo: VersionInfo = {
          version: version.version,
          needsUpdate: version.needsUpdate,
          lastChecked: now,
        }

        this._cachedVersionInfo = versionInfo

        this.log.info('Checked for updates:', version)
        return versionInfo
      } catch (error) {
        this.log.error('Failed to check for updates:', error as Error)
        return undefined
      }
    }

    return this._cachedVersionInfo
  }
}
