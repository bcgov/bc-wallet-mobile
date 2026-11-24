import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'
import { RootPhase } from './root-phase'
import { RootPhaseRoutingFacts, selectRootPhase } from './selectors'

/**
 * The phase the app is in, re-derived when the store or the routing facts change and never stored.
 *
 * @param routing - Startup readiness and the verify routing, from the root's ViewModel.
 * @returns The phase whose route the root registers.
 */
export const useRootPhase = ({
  appReady,
  awaitingStatusForResume,
  showVerifyStack,
}: RootPhaseRoutingFacts): RootPhase => {
  const [store] = useStore<BCState>()

  return useMemo(
    () => selectRootPhase(store, { appReady, awaitingStatusForResume, showVerifyStack }),
    [store, appReady, awaitingStatusForResume, showVerifyStack]
  )
}
