import type { BCSCStore } from '@/bcsc-theme/storage'
import { selectHasAccount, selectSessionRecoveryRequired } from '@/bcsc-theme/storage/hooks'
import { getRootPhase, RootPhase, RootPhaseFacts } from './root-phase'

/** The facts the store does not hold: startup readiness and the verify routing, both decided in the root's ViewModel. */
export type RootPhaseRoutingFacts = Pick<RootPhaseFacts, 'appReady' | 'awaitingStatusForResume' | 'showVerifyStack'>

/** Reads the root phase rule's inputs from the store; `routing` carries the ones the store does not hold. */
export const selectRootPhase = (state: BCSCStore, routing: RootPhaseRoutingFacts): RootPhase =>
  getRootPhase({
    appReady: routing.appReady,
    awaitingStatusForResume: routing.awaitingStatusForResume,
    hasAccount: selectHasAccount(state),
    didAuthenticate: state.session.didAuthenticate,
    sessionRecoveryRequired: selectSessionRecoveryRequired(state),
    showVerifyStack: routing.showVerifyStack,
  })
