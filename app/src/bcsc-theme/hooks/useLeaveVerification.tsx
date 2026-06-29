import { BCDispatchAction, BCState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback } from 'react'

/**
 * Returns a callback that leaves the in-progress verification flow and returns the user to the app
 * home screen, *preserving* their verification progress so they can resume later — unlike
 * {@link useRestartVerification}, which wipes progress.
 *
 * Marking the one-time prompt seen and moving the verification status out of IN_PROGRESS makes the
 * RootStack render the MainStack instead of the VerifyStack (see RootStack `showVerifyStack`). No
 * verification data is cleared, so the user can pick up where they left off via the home screen's
 * "continue verification" notification (which dispatches IN_PROGRESS again).
 *
 * @returns {(onLeave?: () => void) => void} Callback that leaves the flow. The optional `onLeave`
 * runs first (e.g. to close the menu the action was triggered from).
 */
export const useLeaveVerification = () => {
  const [, dispatch] = useStore<BCState>()

  return useCallback(
    (onLeave?: () => void) => {
      onLeave?.()
      // Seen-prompt guards the RootStack's first `showVerifyStack` clause; UNVERIFIED clears the
      // second (IN_PROGRESS) clause, together swapping the VerifyStack for the MainStack (home).
      dispatch({ type: BCDispatchAction.SEEN_VERIFY_PROMPT, payload: [true] })
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS, payload: [VerificationStatus.UNVERIFIED] })
    },
    [dispatch]
  )
}

export default useLeaveVerification
