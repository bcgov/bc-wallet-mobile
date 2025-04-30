import { BaseTourID, TourStep } from '@bifold/core'

import { credentialOfferTourSteps } from './CredentialOfferTourSteps'
import { credentialsTourSteps } from './CredentialsTourSteps'
import { homeTourSteps } from './HomeTourSteps'
import { proofRequestTourSteps } from './ProofRequestTourSteps'

// to extend, add " | BCTourID" where BCTourID has tour IDs specific to BC Wallet
export type TourID = BaseTourID

type Tours = {
  [key in TourID]: TourStep[]
}

const tours: Tours = {
  homeTourSteps,
  credentialsTourSteps,
  credentialOfferTourSteps,
  proofRequestTourSteps,
}

export default tours
