import { FIVE_MINUTES_IN_SECONDS } from '@/constants'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/** The API client's reading of the device clock against the server's, from the last status check */
export interface ClockReading {
  isClockSkewed: boolean
  clockSkewSeconds: number | null
}

/**
 * System check that alerts when the device clock is too far off the server's for signed requests.
 * Reads the same reading the API client uses to refuse token requests, so the two never disagree.
 *
 * @class ServerClockSkewSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class ServerClockSkewSystemCheck implements SystemCheckStrategy {
  constructor(
    private readonly clock: ClockReading,
    private readonly showClockSkewAlert: () => void,
    private readonly utils: SystemCheckUtils
  ) {}

  runCheck() {
    return !this.clock.isClockSkewed
  }

  onFail() {
    const skewSeconds = this.clock.clockSkewSeconds ?? 0
    this.utils.logger.warn('[ServerClockSkewSystemCheck] Server clock skew detected', {
      observedSkewSeconds: Math.abs(skewSeconds),
      deviceClock: skewSeconds > 0 ? 'behind' : 'ahead',
      maxAllowedSkewSeconds: FIVE_MINUTES_IN_SECONDS,
    })

    this.showClockSkewAlert()
  }
}
