import {
  isDidCommInvitation,
  isMediatorInvitation,
  isOpenIdCredentialOffer,
  isOpenIdPresentationRequest,
} from '@bifold/core'

import type { ScanContext, ScanResult, UriStrategy } from './types'

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
    if (await isMediatorInvitation(agent, uri)) {
      logger.info('[DidCommOobStrategy] mediator invitation rejected (BCSC uses .env mediator)')
      return { kind: 'unsupported', reason: 'Mediator' }
    }

    const invitation = await agent.modules.didcomm.oob.parseInvitation(uri)
    if (!invitation) {
      logger.warn('[DidCommOobStrategy] could not parse OOB invitation')
      return { kind: 'unrecognized' }
    }
    const { outOfBandRecord } = await agent.modules.didcomm.oob.receiveInvitation(invitation, {
      label: 'didcomm-oob-invitation',
    })
    return { kind: 'connection', oobRecordId: outOfBandRecord.id }
  },
}

export default DidCommOobStrategy
