import { getResumeStepRoute, ResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'

/**
 * Returns the verify-stack route the user should land on when resuming or
 * (re)entering the verification journey, derived from the current store state.
 */
export const useResumeStepRoute = (): ResumeStepRoute => {
  const [store] = useStore<BCState>()
  return useMemo(() => getResumeStepRoute(store), [store])
}
