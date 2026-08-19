import { AppErrorModal } from '../screens/errors.js'
import { describeCurrentScreen } from './screens.js'

/**
 * How long to give the error modal to answer. It is either already up or it is not — nothing here
 * waits for one to appear, so this only has to cover the round-trip.
 */
const PROBE_TIMEOUT_MS = 1_000

/** Is the app's error modal up? Cheap probe — never scrolls, never throws. */
export async function isAppErrorShowing(timeoutMs: number = PROBE_TIMEOUT_MS): Promise<boolean> {
  return AppErrorModal.isPresent(timeoutMs)
}

/**
 * Fail with the error the app is showing, if it is showing one. Call it wherever a wait is about to
 * spend its full budget on a screen the modal has already made unreachable — the point is to report
 * the app's own error instead of "element not visible after 45000ms".
 */
export async function throwIfAppErrorShowing(context: string): Promise<void> {
  if (!(await isAppErrorShowing())) return
  throw new Error(`${context}: the app raised an error modal. On screen: ${await describeCurrentScreen()}`)
}
