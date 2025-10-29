import { SystemCheckStrategy } from './system-checks'

export class InternetStatusSystemCheck implements SystemCheckStrategy {
  private isOnline: boolean

  constructor(isOnline: boolean) {
    this.isOnline = isOnline
  }

  async runCheck() {
    return this.isOnline
  }

  onFail() {
    console.log('InternetStatusSystemCheck: No internet connection detected')
  }

  onSuccess() {
    console.log('InternetStatusSystemCheck: Internet connection is available')
  }
}
