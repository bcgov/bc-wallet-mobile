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

/** Coerce an unknown thrown value into an Error for logging. */
function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason))
}

/**
 * Handles a single settled check outcome, isolated from the rest of the batch:
 * logs a thrown runCheck, otherwise runs the matching onSuccess/onFail handler
 * (catching any handler failure). Returns the check's boolean result — false when
 * the check threw, since the outcome is then inconclusive.
 */
async function handleCheckOutcome(
  check: SystemCheckStrategy,
  outcome: PromiseSettledResult<boolean>,
  logger?: BifoldLogger
): Promise<boolean> {
  const name = check.constructor.name

  if (outcome.status === 'rejected') {
    logger?.error(`runSystemChecks: ${name} threw during runCheck`, toError(outcome.reason))
    return false
  }

  const passed = outcome.value
  try {
    if (passed) {
      await check.onSuccess?.()
    } else {
      await check.onFail()
    }
  } catch (error) {
    logger?.error(`runSystemChecks: ${name} threw during ${passed ? 'onSuccess' : 'onFail'}`, toError(error))
  }

  return passed
}

/**
 * Runs a series of startup checks and handles failures and successes accordingly.
 *
 * @param {SystemCheckStrategy[]} checks - An array of startup checks to run.
 * @param {BifoldLogger} [logger] - Optional logger used to report isolated check failures.
 * @returns {*} {Promise<boolean[]>} - An array of boolean results indicating the success of each check.
 */
export async function runSystemChecks(checks: SystemCheckStrategy[], logger?: BifoldLogger) {
  // Run every check concurrently but isolate failures: a single check that throws
  // (e.g. EventReasonAlertsSystemCheck when an unverified user has no cached id token)
  // must not abort the whole batch and prevent the others (e.g. TermsOfUseSystemCheck)
  // from running. Promise.allSettled keeps one rejection from sinking the rest.
  const settled = await Promise.allSettled(checks.map((check) => Promise.resolve(check.runCheck())))

  // Handle outcomes in order so each check's onFail/onSuccess runs sequentially
  const results: boolean[] = []
  for (let index = 0; index < settled.length; index++) {
    results.push(await handleCheckOutcome(checks[index], settled[index], logger))
  }

  return results
}
