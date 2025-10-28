import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { IdToken } from '@/bcsc-theme/utils/id-token'
import { BCDispatchAction } from '@/store'
import { ReducerAction } from '@bifold/core'
import { TFunction } from 'i18next'
import { Dispatch } from 'react'

export type SystemCheckStrategy = {
  /**
   * Runs the startup check.
   *
   * @returns {Promise<boolean>} - A promise that resolves to true if the check passes, false otherwise.
   */
  runCheck: () => Promise<boolean>
  /**
   * Handles the failure of the startup check.
   *
   * @returns {Promise<void> | void} - A promise that resolves when the failure handling is complete.
   */
  onFail: () => Promise<void> | void
  /**
   * Handles the success of the startup check.
   *
   * @returns {Promise<void> | void} - A promise that resolves when the success handling is complete.
   */
  onSuccess?: () => Promise<void> | void
}

/**
 * Runs a series of startup checks and handles failures and successes accordingly.
 *
 * @param {SystemCheckStrategy[]} checks - An array of startup checks to run.
 * @returns {*} {Promise<boolean[]>} - An array of boolean results indicating the success of each check.
 */
export async function runSystemChecks(checks: SystemCheckStrategy[]) {
  const startupPromises: Promise<boolean>[] = []

  // Add all startup check promises to array
  for (const check of checks) {
    startupPromises.push(check.runCheck())
  }

  // Wait for all startup checks to complete in parallel
  const results = await Promise.all(startupPromises)

  // Handle failures in order
  // To be determined if we want automatic failure handling or not (pass param if not)
  results.forEach(async (result, index) => {
    if (!result) {
      await checks[index].onFail()
      return
    }

    await checks[index].onSuccess?.()
  })

  return results
}

/**
 * Checks if the number of registered devices exceeds the allowed limit.
 *
 * Note: Determines the limit based on the values in the ID token.
 *   On failure, it dispatches a warning banner message.
 *   On success, it removes the banner if it exists.
 *
 * @class DeviceCountStartupCheck
 * @implements {SystemCheckStrategy}
 */
export class DeviceCountSystemCheck implements SystemCheckStrategy {
  constructor(
    private config: {
      dispatch: Dispatch<ReducerAction<any>>
      translation: TFunction
      getIdToken: () => Promise<IdToken>
    }
  ) {}

  /**
   * Runs the device count check to verify if the number of registered devices is within the allowed limit.
   *
   * @returns {Promise<boolean>} - A promise that resolves to true if the device count is within the limit, false otherwise.
   */
  async runCheck() {
    try {
      const idToken = await this.config.getIdToken()

      return idToken.bcsc_devices_count < idToken.bcsc_max_devices
    } catch (error) {
      return false
    }
  }

  /**
   * Handles the failure of the device count check by dispatching a warning banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.config.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
          title: this.config.translation('Unified.SystemChecks.Devices.DeviceLimitReachedBannerTitle'),
          type: 'warning',
          variant: 'summary',
          dismissible: false, // Non-dismissible banner (user must dismiss from screen)
        },
      ],
    })
  }

  /**
   * Handles the success of the device count check by removing the warning banner message if it exists.
   *
   * @returns {*} {void}
   */
  onSuccess() {
    this.config.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.DEVICE_LIMIT_EXCEEDED] })
  }
}

/**
 * Checks the IAS server status.
 *
 * Note: Determines server availability via the config API.
 *   On failure, it dispatches a warning banner message.
 *   On success, it removes the banner if it exists.
 *
 * @class ServerStatusStartupCheck
 * @implements {SystemCheckStrategy}
 */
export class ServerStatusSystemCheck implements SystemCheckStrategy {
  constructor(
    private config: {
      dispatch: Dispatch<ReducerAction<any>>
      translation: TFunction
      getServerStatus: () => Promise<ServerStatusResponseData>
    }
  ) {}

  /**
   * Runs the server status check to verify if the IAS server is available.
   *
   * @returns {*} {Promise<boolean>} - A promise that resolves to true if the server is available, false otherwise.
   */
  async runCheck() {
    try {
      const serverStatus = await this.config.getServerStatus()
      return serverStatus.status === 'ok'
    } catch (error) {
      return false
    }
  }

  /**
   * Handles the failure of the server status check by dispatching an error banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.config.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
          title: this.config.translation('Unified.SystemChecks.ServerStatus.UnavailableBannerTitle'),
          type: 'error',
          variant: 'summary',
          dismissible: true,
        },
      ],
    })
  }

  /**
   * Handles the success of the server status check by removing the error banner message if it exists.
   *
   * @returns {*} {void}
   */
  onSuccess() {
    this.config.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.IAS_SERVER_UNAVAILABLE] })
  }
}
