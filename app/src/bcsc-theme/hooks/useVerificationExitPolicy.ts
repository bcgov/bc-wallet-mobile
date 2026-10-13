import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'

/**
 * Which exits the verify flow offers the current user. Decided by the answer to the onboarding
 * "Verify your account" prompt (`bcsc.verificationSkipped`, see store.tsx): Continue makes a
 * first-time verifier, Skip a deferred one. A v3 upgrade mid-verification counts as Continue, and
 * finishing verification counts as Skip, so a later renewal starts from Home like any deferred entry.
 */
export type VerificationExitPolicy = {
  /**
   * Chose to verify at the prompt and has not finished. The flow is their whole app, so it offers no
   * way out to Home: the back arrow at the beginning of the stack returns to the prompt instead, the
   * pending-review screen has no arrow at all, and the help menu has no "Back to home".
   */
  isFirstTimeVerifier: boolean
  /**
   * Whether the help menu offers "Back to home": everyone but a first-time verifier, plus developer
   * mode so a tester can always get out. Arrows and hardware back ignore developer mode.
   */
  showBackToHomeMenuRow: boolean
  /** Developer mode is on: a tester's escape hatches (such as Back to home on the prompt) are offered. */
  isDeveloperMode: boolean
}

export const useVerificationExitPolicy = (): VerificationExitPolicy => {
  const [store] = useStore<BCState>()
  const { verificationSkipped } = store.bcsc
  const { developerModeEnabled } = store.preferences

  return useMemo(() => {
    // `undefined` (prompt not answered yet) only occurs on the prompt itself, whose exits are its own buttons
    const isFirstTimeVerifier = verificationSkipped === false
    const isDeveloperMode = Boolean(developerModeEnabled)

    return {
      isFirstTimeVerifier,
      showBackToHomeMenuRow: !isFirstTimeVerifier || isDeveloperMode,
      isDeveloperMode,
    }
  }, [verificationSkipped, developerModeEnabled])
}

export default useVerificationExitPolicy
