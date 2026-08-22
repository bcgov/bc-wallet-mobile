import {
  KEY_ROTATION_MAX_AGE_DAYS,
  KEY_ROTATION_RETRY_BACKOFF_DAYS,
  keyAgeDays,
  keyCreatedAtMs,
  KeyRotationResult,
} from '@/bcsc-theme/utils/key-rotation'
import { BCDispatchAction } from '@/store'
import { getAllKeys } from 'react-native-bcsc-core'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

type RotateFunction = () => Promise<KeyRotationResult>

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Startup check that rotates the device's signing key once it reaches
 * {@link KEY_ROTATION_MAX_AGE_DAYS}. See issue #3876 for the full design.
 *
 * `runCheck` deliberately "passes" (skips rotation, returns true) in every case where rotation
 * cannot be safely determined or attempted:
 *   - the app version/build changed this launch — `UpdateDeviceRegistrationSystemCheck.onFail`
 *     (which runs earlier in the same MAIN_STACK batch, sequentially) will PUT the current key
 *     anyway; deferring here avoids two automatic registration PUTs racing in one launch.
 *   - a previous attempt is within the retry backoff window.
 *   - the newest local key's age can't be determined (keystore enumeration threw, is empty, or
 *     the newest entry has no `created`) — never rotate on "can't tell".
 *   - the newest key's normalized age is below the rotation threshold.
 *
 * It fails (triggering `onFail`) only when the newest local key's age is confirmed to be at or
 * beyond the threshold.
 */
export class KeyRotationSystemCheck implements SystemCheckStrategy {
  private readonly lastAppVersion: string
  private readonly lastAppBuildNumber: string
  private readonly lastRotationAttemptAt: string | undefined
  private readonly rotate: RotateFunction
  private readonly utils: SystemCheckUtils

  constructor(
    lastAppVersion: string,
    lastAppBuildNumber: string,
    lastRotationAttemptAt: string | undefined,
    rotate: RotateFunction,
    utils: SystemCheckUtils
  ) {
    this.lastAppVersion = lastAppVersion
    this.lastAppBuildNumber = lastAppBuildNumber
    this.lastRotationAttemptAt = lastRotationAttemptAt
    this.rotate = rotate
    this.utils = utils
  }

  async runCheck(): Promise<boolean> {
    // Defer on any launch where the app version/build changed — UpdateDeviceRegistrationSystemCheck
    // (which runs earlier in the same MAIN_STACK batch) already PUTs the current key on this launch.
    if (this.lastAppVersion !== getVersion() || this.lastAppBuildNumber !== getBuildNumber()) {
      this.utils.logger.info('KeyRotationSystemCheck: skipping — app version/build changed this launch')
      return true
    }

    if (this.lastRotationAttemptAt) {
      const lastAttemptMs = Date.parse(this.lastRotationAttemptAt)
      if (!Number.isNaN(lastAttemptMs)) {
        const daysSinceLastAttempt = (Date.now() - lastAttemptMs) / MS_PER_DAY
        if (daysSinceLastAttempt < KEY_ROTATION_RETRY_BACKOFF_DAYS) {
          this.utils.logger.info(
            `KeyRotationSystemCheck: skipping — last attempt was ${daysSinceLastAttempt.toFixed(1)} day(s) ago (backoff=${KEY_ROTATION_RETRY_BACKOFF_DAYS}d)`
          )
          return true
        }
      }
    }

    let keys
    try {
      keys = await getAllKeys()
    } catch (error) {
      this.utils.logger.warn(
        `KeyRotationSystemCheck: skipping — could not enumerate local keys: ${error instanceof Error ? error.message : String(error)}`
      )
      return true
    }

    if (!keys || keys.length === 0) {
      this.utils.logger.warn('KeyRotationSystemCheck: skipping — no local keys found')
      return true
    }

    const newest = keys.slice().sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0]
    const createdAtMs = keyCreatedAtMs(newest.created)
    if (createdAtMs === null) {
      this.utils.logger.warn(`KeyRotationSystemCheck: skipping — newest key '${newest.id}' has no created timestamp`)
      return true
    }

    const ageDays = keyAgeDays(createdAtMs)
    if (ageDays < KEY_ROTATION_MAX_AGE_DAYS) {
      return true
    }

    this.utils.logger.info(
      `KeyRotationSystemCheck: newest key '${newest.id}' is ${ageDays.toFixed(1)} day(s) old (threshold=${KEY_ROTATION_MAX_AGE_DAYS}d) — rotation due`
    )
    return false
  }

  async onFail(): Promise<void> {
    // Dispatched FIRST so the backoff throttle survives a crash mid-rotation — a repeated
    // attempt on the very next launch is worse than a rotation that's merely delayed 7 days.
    this.utils.dispatch({
      type: BCDispatchAction.KEY_ROTATION_ATTEMPTED,
      payload: [new Date().toISOString()],
    })

    try {
      const result = await this.rotate()
      this.utils.logger.info(`KeyRotationSystemCheck: rotation attempt finished with status='${result.status}'`)
    } catch (error) {
      // rotate() (rotateSigningKey) is designed to never throw, but this is a silent
      // background flow (favour idempotency over erroring) — swallow defensively regardless.
      this.utils.logger.error(
        'KeyRotationSystemCheck: rotation attempt threw unexpectedly',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }
}
