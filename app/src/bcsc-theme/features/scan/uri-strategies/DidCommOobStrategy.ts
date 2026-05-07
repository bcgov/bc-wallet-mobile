import type { Agent } from '@credo-ts/core'

import type { ScanContext, ScanResult, UriStrategy } from './types'

export const isOpenIdCredentialOffer = (url: string): boolean => {
  if (url.startsWith('openid-initiate-issuance://') || url.startsWith('openid-credential-offer://')) {
    return true
  }
  return url.includes('credential_offer_uri=') || url.includes('credential_offer=')
}

export const isOpenIdPresentationRequest = (url: string): boolean => {
  if (url.startsWith('openid://') || url.startsWith('openid-vc://') || url.startsWith('openid4vp://')) {
    return true
  }
  return url.includes('request_uri=') || url.includes('request=')
}

export const isDidCommInvitation = (url: string): boolean => {
  if (url.startsWith('didcomm://')) {
    return true
  }
  return url.includes('c_i=') || url.includes('oob=') || url.includes('oobUrl=') || url.includes('d_m=')
}

const isMediatorInvitation = async (agent: Agent, url: string): Promise<boolean> => {
  try {
    const invitation = await agent.modules.didcomm.oob.parseInvitation(url)
    return invitation?.goalCode === 'aries.vc.mediate'
  } catch {
    return false
  }
}

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
