import { BCSCModals, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BifoldLogger, ReducerAction } from '@bifold/core'
import { NavigationState } from '@react-navigation/native'
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

export interface SystemCheckNavigationUtils extends SystemCheckUtils {
  /**
   * Navigation object to handle screen transitions.
   *
   * @type {SystemCheckNavigation}
   */
  navigation: SystemCheckNavigation
}

type ScreenNavigation = (screen: BCSCScreens | BCSCModals) => void
type ParamNavigation = (screen: BCSCScreens | BCSCModals, params?: object) => void

// Simple interface to abstract navigation methods needed for system checks
export type SystemCheckNavigation = {
  navigate: ScreenNavigation | ParamNavigation
  canGoBack: () => boolean
  goBack: () => void
  getState: () => NavigationState | undefined
}

/**
 * Runs a series of startup checks and handles failures and successes accordingly.
 *
 * @param {SystemCheckStrategy[]} checks - An array of startup checks to run.
 * @returns {*} {Promise<boolean[]>} - An array of boolean results indicating the success of each check.
 */
export async function runSystemChecks(checks: SystemCheckStrategy[], logger?: BifoldLogger) {
  // Run every check concurrently but isolate failures: a single check that throws
  // (e.g. EventReasonAlertsSystemCheck when an unverified user has no cached id token)
  // must not abort the whole batch and prevent the others (e.g. TermsOfUseSystemCheck)
  // from running. Promise.allSettled keeps one rejection from sinking the rest.
  const settled = await Promise.allSettled(checks.map((check) => Promise.resolve(check.runCheck())))

  const results: boolean[] = []

  // Handle outcomes in order
  for (let index = 0; index < settled.length; index++) {
    const outcome = settled[index]
    const name = checks[index].constructor.name

    if (outcome.status === 'rejected') {
      // An errored check is inconclusive: record false and skip its handlers
      logger?.error(
        `runSystemChecks: ${name} threw during runCheck`,
        outcome.reason instanceof Error ? outcome.reason : new Error(String(outcome.reason))
      )
      results.push(false)
      continue
    }

    results.push(outcome.value)

    try {
      if (!outcome.value) {
        await checks[index].onFail()
      } else {
        await checks[index].onSuccess?.()
      }
    } catch (error) {
      // A failing handler must not prevent the remaining checks from being handled
      logger?.error(
        `runSystemChecks: ${name} threw during ${outcome.value ? 'onSuccess' : 'onFail'}`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  return results
}
