import { useBCSCStore } from '@/bcsc-theme/storage'
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
}: RootPhaseRoutingFacts): RootPhase =>
  useBCSCStore((state) => selectRootPhase(state, { appReady, awaitingStatusForResume, showVerifyStack }))
