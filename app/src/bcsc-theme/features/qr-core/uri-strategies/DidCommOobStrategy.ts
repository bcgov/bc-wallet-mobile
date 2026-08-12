import { isDidCommInvitation, isOpenIdCredentialOffer, isOpenIdPresentationRequest } from '@bifold/core'

import type { ScanContext, ScanResult, UriStrategy } from './types'

// Aries-standard goal code for mediator invitations; checked inline so we
// only parse the invitation once on the success path (Bifold's
// `isMediatorInvitation` does its own parse, which would double the work).
const MEDIATOR_GOAL_CODE = 'aries.vc.mediate'

const DidCommOobStrategy: UriStrategy = {
  name: 'didcomm-oob',

  matches(uri) {
    return (
      isDidCommInvitation(uri) ||
      isOpenIdCredentialOffer(uri) ||
      isOpenIdPresentationRequest(uri) ||
      isVcAuthnLogin(uri)
    )
  },

  async handle(uri, ctx: ScanContext): Promise<ScanResult> {
    const { agent: agentPromise, logger } = ctx

    // agent may be a promise, so await it here to ensure it's ready before proceeding
    const agent = await agentPromise

    if (!agent) {
      return { kind: 'unsupported', reason: 'AgentNotReady' }
    }

    if (isOpenIdCredentialOffer(uri) || isOpenIdPresentationRequest(uri)) {
      logger.info('[DidCommOobStrategy] OpenID URI rejected (BCSC v4.1 is AnonCreds-only)')
      return { kind: 'unsupported', reason: 'OpenID' }
    }

    // TODO (MD): Fully type the agent and it's modules
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

    // `label` becomes `theirLabel` on the inviter's connection record and
    // shows up as the contact name in their chat header.
    const { outOfBandRecord } = await agent.modules.didcomm.oob.receiveInvitation(invitation, {
      label: ctx.label || 'didcomm-oob-invitation',
    })

    return { kind: 'connection', oobRecordId: outOfBandRecord.id }
  },
}

/**
 * Checks if a given URI is a VC Authn login URI.
 *
 * @example https://example.com/url/pres_exch/123e4567-e89b-12d3-a456-426614174000
 *
 * @param uri The URI to check
 * @returns True if the URI is a VC Authn URI, false otherwise
 */
function isVcAuthnLogin(uri: string): boolean {
  let url: URL
  const vcauthnRegex = /^\/url\/pres_exch\/[0-9a-f-]{36}\/?$/i

  try {
    url = new URL(uri)
  } catch {
    return false
  }

  return vcauthnRegex.test(url.pathname)
}

export default DidCommOobStrategy
