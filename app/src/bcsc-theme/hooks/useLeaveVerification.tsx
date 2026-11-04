import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback } from 'react'

/**
 * Returns a callback that leaves the in-progress verification flow and returns the user to the app
 * home screen, *preserving* their verification progress so they can resume later — unlike
 * {@link useRestartVerification}, which wipes progress.
 *
 * Leaving the verify flow makes the RootStack render the MainStack instead of the VerifyStack (see
 * RootStack `showVerifyStack`). No verification data is cleared, so the user can pick up where they
 * left off via the home screen's "continue verification" notification (which re-enters the flow).
 *
 * Only a deferred verifier (or developer mode) is offered this exit; see
 * {@link useVerificationExitPolicy} for who gets which way out.
 *
 * @returns {(onLeave?: () => void) => void} Callback that leaves the flow. The optional `onLeave`
 * runs first (e.g. to close the menu the action was triggered from).
 */
export const useLeaveVerification = () => {
  const [, dispatch] = useStore<BCState>()

  return useCallback(
    (onLeave?: () => void) => {
      onLeave?.()
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, payload: [false] })
    },
    [dispatch]
  )
}

export default useLeaveVerification
