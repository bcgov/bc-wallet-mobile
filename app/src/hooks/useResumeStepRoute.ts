import { useJourney } from '@/bcsc-theme/state/verification/journey'
import { getResumeStepRoute, ResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { useMemo } from 'react'

/**
 * Returns the verify-stack route the user should land on when resuming or
 * (re)entering the verification journey, derived from the current store state.
 */
export const useResumeStepRoute = (): ResumeStepRoute => {
  // BCSC only (BCSCApiClientContext), so it reads the BCSC store
  const journey = useJourney()
  return useMemo(() => getResumeStepRoute(journey), [journey])
}
