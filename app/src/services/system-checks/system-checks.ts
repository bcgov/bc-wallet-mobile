import { BifoldLogger, ReducerAction } from '@bifold/core'
import { TFunction } from 'i18next'
import { Dispatch } from 'react'

export type SystemCheckStrategy = {
  /**
   * Runs the startup check.
   *
   * @returns {Promise<boolean> | boolean} - A promise that resolves to true if the check passes, false otherwise.
   */
  runCheck: () => Promise<boolean> | boolean
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

// Common utilities used across system checks
export interface SystemCheckUtils {
  /**
   * Dispatch function to send actions to the store.
   *
   * @type {Dispatch<ReducerAction<any>>}
   */
  dispatch: Dispatch<ReducerAction<any>>
  /**
   * Translation function for internationalization.
   *
   * @type {TFunction}
   */
  translation: TFunction
  /**
   * Logger for logging messages and errors.
   *
   * @type {BifoldLogger}
   */
  logger: BifoldLogger
}

/**
 * Runs a series of startup checks and handles failures and successes accordingly.
 *
 * @param {SystemCheckStrategy[]} checks - An array of startup checks to run.
 * @returns {*} {Promise<boolean[]>} - An array of boolean results indicating the success of each check.
 */
export async function runSystemChecks(checks: SystemCheckStrategy[]) {
  const runCheckPromises: Array<Promise<boolean> | boolean> = []

  // Add all startup check promises to array
  for (const check of checks) {
    runCheckPromises.push(check.runCheck())
  }

  // Wait for all startup checks to complete in parallel
  const results = await Promise.all(runCheckPromises)

  // Handle failures in order
  // To be determined if we want automatic failure handling or not (pass param if not)
  for (let index = 0; index < results.length; index++) {
    if (!results[index]) {
      await checks[index].onFail()
      continue
    }

    await checks[index].onSuccess?.()
  }

  return results
}
