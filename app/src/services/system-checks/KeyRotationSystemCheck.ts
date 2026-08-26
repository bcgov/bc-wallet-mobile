import {
  KEY_ROTATION_MAX_AGE_DAYS,
  KEY_ROTATION_RETRY_BACKOFF_DAYS,
  keyAgeDays,
  keyCreatedAtMs,
  KeyRotationResult,
} from '@/bcsc-theme/utils/key-rotation'
import { BCDispatchAction } from '@/store'
import { getAllKeys } from 'react-native-bcsc-core'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

type RotateFunction = () => Promise<KeyRotationResult>

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Startup check that rotates the device's signing key once it reaches
 * {@link KEY_ROTATION_MAX_AGE_DAYS}. `runCheck` "passes" (returns true, skips rotation) whenever
 * rotation can't be safely determined or attempted; it only fails (triggering `onFail`) once the
 * newest local key's age is confirmed at or beyond the threshold. See issue #3876.
 */
export class KeyRotationSystemCheck implements SystemCheckStrategy {
  private readonly deferForPendingRegistrationUpdate: boolean
  private readonly lastRotationAttemptAt: string | undefined
  private readonly rotate: RotateFunction
  private readonly utils: SystemCheckUtils

  /**
   * @param deferForPendingRegistrationUpdate Whether the app version/build changed since the
   *   PREVIOUS launch, so `UpdateDeviceRegistrationSystemCheck` will PUT the current key this
   *   same launch. Must be derived from a marker stamped unconditionally every launch
   *   (`lastSeenAppVersion`/`lastSeenAppBuildNumber`), never from `appVersion`/`appBuildNumber` —
   *   those only advance after a successful registration PUT, so a persistently failing PUT
   *   would latch rotation off forever (see the #3876 review that caught this).
   */
  constructor(
    deferForPendingRegistrationUpdate: boolean,
    lastRotationAttemptAt: string | undefined,
    rotate: RotateFunction,
    utils: SystemCheckUtils
  ) {
    this.deferForPendingRegistrationUpdate = deferForPendingRegistrationUpdate
    this.lastRotationAttemptAt = lastRotationAttemptAt
    this.rotate = rotate
    this.utils = utils
  }

  async runCheck(): Promise<boolean> {
    if (this.deferForPendingRegistrationUpdate) {
      this.utils.logger.info(
        'KeyRotationSystemCheck: skipping — app version/build changed since the last launch; UpdateDeviceRegistrationSystemCheck will PUT the current key this launch'
      )
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

    // Never rotate on "can't tell": enumeration failure, an empty keystore, and a missing
    // `created` all skip rather than risk rotating (or not) based on a guess.
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
    // Dispatched before rotate() so the backoff throttle survives a crash mid-rotation.
    this.utils.dispatch({
      type: BCDispatchAction.KEY_ROTATION_ATTEMPTED,
      payload: [new Date().toISOString()],
    })

    try {
      const result = await this.rotate()
      this.utils.logger.info(
        `KeyRotationSystemCheck: rotation attempt finished with status='${result.status}' confirmed=${result.confirmed}`
      )
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
