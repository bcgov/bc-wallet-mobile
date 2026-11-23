import { useMemo } from 'react'
import { journeyVerificationState, useJourney } from './journey'
import { VerificationState } from './verification-state'

/** The user's verification state, re-derived when its inputs change and never stored. */
export const useVerificationState = (): VerificationState => {
  const journey = useJourney()

  return useMemo(() => journeyVerificationState(journey), [journey])
}
