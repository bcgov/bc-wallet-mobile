import { Timeouts } from '../constants.js'
import { AppErrorModal } from '../screens/errors.js'
import { describeCurrentScreen } from './screens.js'

/**
 * How long to give the error modal to answer. It is either already up or it is not — nothing here
 * waits for one to appear, so this only has to cover the round-trip.
 */
const PROBE_TIMEOUT_MS = 1_000

/** Cap on the details carried into a failure message — the modal can hold a stack. */
const DETAILS_MAX_CHARS = 400

/** Is the app's error modal up? Cheap probe — never scrolls, never throws. */
export async function isAppErrorShowing(timeoutMs: number = PROBE_TIMEOUT_MS): Promise<boolean> {
  return AppErrorModal.isPresent(timeoutMs)
}

/**
 * The modal's expandable details ("Error code N - message"), or '' when it carries none. Best-effort:
 * a details read must never mask the failure it decorates.
 */
export async function readAppErrorDetails(): Promise<string> {
  try {
    if (!(await AppErrorModal.isVisible('showDetails'))) return ''
    await AppErrorModal.link('showDetails')
    const details = await AppErrorModal.read('details', Timeouts.ELEMENT_VISIBLE)
    return details.replaceAll(/\s+/g, ' ').trim().slice(0, DETAILS_MAX_CHARS)
  } catch {
    return ''
  }
}

/** The screen dump plus the modal's details — what a recorder or camera failure should carry. */
export async function describeAppError(): Promise<string> {
  const details = await readAppErrorDetails()
  const screen = await describeCurrentScreen()
  return details ? `${screen} | details: ${details}` : screen
}

/**
 * Fail with the error the app is showing, if it is showing one. Call it wherever a wait is about to
 * spend its full budget on a screen the modal has already made unreachable — the point is to report
 * the app's own error instead of "element not visible after 45000ms".
 */
export async function throwIfAppErrorShowing(context: string): Promise<void> {
  if (!(await isAppErrorShowing())) return
  throw new Error(`${context}: the app raised an error modal. On screen: ${await describeAppError()}`)
}
