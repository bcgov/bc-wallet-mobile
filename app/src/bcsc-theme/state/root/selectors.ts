import { BCState } from '@/store'
import { getRootPhase, RootPhase, RootPhaseFacts } from './root-phase'

/** The facts the store does not hold: startup readiness and the verify routing, both decided in the root's ViewModel. */
export type RootPhaseRoutingFacts = Pick<RootPhaseFacts, 'appReady' | 'awaitingStatusForResume' | 'showVerifyStack'>

/** Reads the root phase rule's inputs from the store; `routing` carries the ones the store does not hold. */
export const selectRootPhase = (state: BCState, routing: RootPhaseRoutingFacts): RootPhase =>
  getRootPhase({
    appReady: routing.appReady,
    awaitingStatusForResume: routing.awaitingStatusForResume,
    hasAccount: state.bcsc.hasAccount,
    didAuthenticate: state.authentication.didAuthenticate,
    sessionRecoveryRequired: state.bcscSecure.sessionRecoveryRequired,
    showVerifyStack: routing.showVerifyStack,
  })
