import { FIVE_MINUTES_IN_SECONDS } from '@/constants'
import { ErrorAlertContextType } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { Linking } from 'react-native'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * System check to detect server clock skew issues by comparing the server timestamp with the device timestamp.
 *
 * @class ServerClockSkewSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class ServerClockSkewSystemCheck implements SystemCheckStrategy {
  constructor(
    private readonly serverTimestamp: Date,
    private readonly deviceTimestamp: Date,
    private readonly emitAlert: ErrorAlertContextType['emitAlert'],
    private readonly utils: SystemCheckUtils
  ) {}

  private getClockSkewInSeconds() {
    return Math.abs((this.serverTimestamp.getTime() - this.deviceTimestamp.getTime()) / 1000)
  }

  runCheck() {
    return this.getClockSkewInSeconds() < FIVE_MINUTES_IN_SECONDS
  }

  onFail() {
    this.utils.logger.warn('[ServerClockSkewSystemCheck] Server clock skew detected', {
      serverTimestamp: this.serverTimestamp.toISOString(),
      deviceTimestamp: this.deviceTimestamp.toISOString(),
      maxAllowedSkewSeconds: FIVE_MINUTES_IN_SECONDS,
      observedSkewSeconds: this.getClockSkewInSeconds(),
    })

    // Emit an alert to the user about the clock skew issue with an option to open device settings
    this.emitAlert(
      this.utils.translation('Alerts.ClockSkewError.Title'),
      this.utils.translation('Alerts.ClockSkewError.Description'),
      {
        event: AppEventCode.CLOCK_SKEW_ERROR,
        actions: [
          {
            text: this.utils.translation('Global.Close'),
          },
          {
            text: this.utils.translation('Alerts.ClockSkewError.Action1'),
            onPress: async () => {
              try {
                await Linking.openSettings()
              } catch (error) {
                this.utils.logger.error(`[ServerClockSkewSystemCheck] Error opening device settings: ${error}`)
              }
            },
          },
        ],
      }
    )
  }
}
