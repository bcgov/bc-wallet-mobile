import { isDidCommInvitation, isOpenIdCredentialOffer, isOpenIdPresentationRequest } from '@bifold/core'

import type { ScanContext, ScanResult, UriStrategy } from './types'

// Aries-standard goal code for mediator invitations; checked inline so we
// only parse the invitation once on the success path (Bifold's
// `isMediatorInvitation` does its own parse, which would double the work).
const MEDIATOR_GOAL_CODE = 'aries.vc.mediate'

const DidCommOobStrategy: UriStrategy = {
  name: 'didcomm-oob',

  matches(uri) {
    return isDidCommInvitation(uri) || isOpenIdCredentialOffer(uri) || isOpenIdPresentationRequest(uri)
  },

  async handle(uri, ctx: ScanContext): Promise<ScanResult> {
    const { agent, logger } = ctx
    if (!agent) {
      return { kind: 'unsupported', reason: 'AgentNotReady' }
    }
    if (isOpenIdCredentialOffer(uri) || isOpenIdPresentationRequest(uri)) {
      logger.info('[DidCommOobStrategy] OpenID URI rejected (BCSC v4.1 is AnonCreds-only)')
      return { kind: 'unsupported', reason: 'OpenID' }
    }

    const invitation = await agent.modules.didcomm.oob.parseInvitation(uri)
    if (!invitation) {
      logger.warn('[DidCommOobStrategy] could not parse OOB invitation')
      return { kind: 'unrecognized' }
    }
    if (invitation.goalCode === MEDIATOR_GOAL_CODE) {
      logger.info('[DidCommOobStrategy] mediator invitation rejected (BCSC uses .env mediator)')
      return { kind: 'unsupported', reason: 'Mediator' }
    }

    // Dedupe duplicate scans of the same QR: two didexchange requests for one
    // invitation @id leave the user stuck on "Connecting…".
    const existing = await agent.modules.didcomm.oob.findByReceivedInvitationId(invitation.id)
    if (existing) {
      logger.info(`[DidCommOobStrategy] reusing existing OOB record ${existing.id} for invitation ${invitation.id}`)
      return { kind: 'connection', oobRecordId: existing.id }
    }

    const { outOfBandRecord } = await agent.modules.didcomm.oob.receiveInvitation(invitation, {
      label: 'didcomm-oob-invitation',
    })
    return { kind: 'connection', oobRecordId: outOfBandRecord.id }
  },
}

export default DidCommOobStrategy
