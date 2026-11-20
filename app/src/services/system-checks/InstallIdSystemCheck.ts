import uuid from 'react-native-uuid'
import { SystemCheckStrategy } from './system-checks'

export class InstallIdSystemCheck implements SystemCheckStrategy {
  private readonly installId: string | undefined
  private readonly saveInstallId: (installId: string) => Promise<void>

  constructor(installId: string | undefined, saveInstallId: (installId: string) => Promise<void>) {
    this.installId = installId
    this.saveInstallId = saveInstallId
  }

  runCheck(): boolean {
    return !!this.installId
  }

  onFail(): void {
    void this.saveInstallId(uuid.v4().toString())
  }
}
