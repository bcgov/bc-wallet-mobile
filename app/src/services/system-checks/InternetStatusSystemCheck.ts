import { SystemCheckStrategy } from './system-checks'

export class InternetStatusSystemCheck implements SystemCheckStrategy {
  private isOnline: boolean

  constructor() {}

  async runCheck() {}

  onFail() {
    // No-op
  }

  onSuccess() {
    // No-op
  }
}
