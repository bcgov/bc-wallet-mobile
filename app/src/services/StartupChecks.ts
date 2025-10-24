import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { IdToken } from '@/bcsc-theme/utils/id-token'
import { DispatchAction, ReducerAction } from '@bifold/core'
import { Dispatch } from 'react'

type StartupCheckStrategy = {
  /**
   * Runs the startup check.
   * @returns {Promise<boolean>} - A promise that resolves to true if the check passes, false otherwise.
   */
  runCheck: () => Promise<boolean>
  /**
   * Handles the failure of the startup check.
   * @returns {Promise<void> | void} - A promise that resolves when the failure handling is complete.
   */
  onFail: () => Promise<void> | void
}

/**
 * Runs a series of startup checks and handles failures accordingly.
 *
 * @param {StartupCheckStrategy[]} checks - An array of startup checks to run.
 * @returns {Promise<boolean[]>} - An array of boolean results indicating the success of each check.
 */
export async function runStartupChecks(checks: StartupCheckStrategy[]) {
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
    }
  })

  return results
}

/**
 * Checks if the number of registered devices exceeds the allowed limit.
 *
 * Note: Determines the limit based on the values in the ID token. On failure,
 * it dispatches a warning banner message.
 *
 * @class DeviceCountStartupCheck
 * @implements {StartupCheckStrategy}
 */
export class DeviceCountStartupCheck implements StartupCheckStrategy {
  constructor(
    private config: {
      getIdToken: () => Promise<IdToken>
      dispatch: Dispatch<ReducerAction<any>>
      bannerTitle: string
    }
  ) {}

  async runCheck() {
    try {
      const idToken = await this.config.getIdToken()

      return idToken.bcsc_devices_count < idToken.bcsc_max_devices
    } catch (error) {
      // QUESTION (MD): Should we fail true or false if we can't get the ID token?
      return false
    }
  }

  onFail() {
    this.config.dispatch({
      type: DispatchAction.BANNER_MESSAGES,
      payload: [
        {
          id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
          title: this.config.bannerTitle,
          type: 'warning',
          variant: 'summary',
          dismissible: true,
        },
      ],
    })
  }
}

/**
 * Checks the IAS server status.
 *
 * Note: On failure, it dispatches a warning banner message.
 *
 * @class ServerStatusStartupCheck
 * @implements {StartupCheckStrategy}
 */
export class ServerStatusStartupCheck implements StartupCheckStrategy {
  constructor(
    private config: {
      getServerStatus: () => Promise<ServerStatusResponseData>
      dispatch: Dispatch<ReducerAction<any>>
      bannerTitle: string
    }
  ) {}

  async runCheck() {
    try {
      const serverStatus = await this.config.getServerStatus()
      return serverStatus.status === 'ok'
    } catch (error) {
      return false
    }
  }

  onFail() {
    this.config.dispatch({
      type: DispatchAction.BANNER_MESSAGES,
      payload: [
        {
          id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
          title: this.config.bannerTitle,
          type: 'warning',
          variant: 'summary',
          dismissible: true,
        },
      ],
    })
  }
}
