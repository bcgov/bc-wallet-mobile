import { randomUUID } from 'node:crypto'

/**
 * QR payloads for the scanner's DETERMINISTIC unsupported branches (`DidCommOobStrategy`) — content
 * the app must recognize enough to REJECT, never enough to act on. Injected via `injectQrCode`.
 */

/**
 * An OpenID credential-offer URI. Bifold's `isOpenIdCredentialOffer` matches on the scheme alone and
 * the strategy rejects it before any parsing ("OpenID credentials aren't supported…"), so the suffix
 * is a label, not data.
 */
export const openIdCredentialOfferUri = (): string => 'openid-credential-offer://e2e-unsupported-probe'

/**
 * A did:key from the did:key spec test vectors — a VALID ed25519 key that belongs to nobody we know.
 * The invitation is rejected at the goal-code check, so the key is only ever parsed, never contacted.
 */
const TEST_VECTOR_DID_KEY = 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH'

/**
 * An out-of-band invitation URL carrying the Aries mediation goal code. It must survive credo's
 * `parseInvitation` (real `@type`/`@id`, a handshake protocol, one valid inline service) to reach the
 * strategy's goal-code check, where `aries.vc.mediate` is rejected ("Mediator invitations aren't
 * supported…") — before any network use, so the endpoint is never contacted. If a credo upgrade ever
 * tightens validation past this shape, mint a real invitation with this goal code from the issuer
 * (`createInvitation`) instead.
 */
export function mediatorInviteUri(): string {
  const invitation = {
    '@type': 'https://didcomm.org/out-of-band/1.1/invitation',
    '@id': randomUUID(),
    label: 'e2e mediator probe',
    goal_code: 'aries.vc.mediate',
    accept: ['didcomm/aip1', 'didcomm/aip2;env=rfc19'],
    handshake_protocols: ['https://didcomm.org/didexchange/1.1'],
    services: [
      {
        id: '#inline',
        type: 'did-communication',
        recipientKeys: [TEST_VECTOR_DID_KEY],
        routingKeys: [],
        serviceEndpoint: 'https://example.org/e2e-mediator-probe',
      },
    ],
  }
  const encoded = Buffer.from(JSON.stringify(invitation)).toString('base64url')
  return `https://example.org/e2e-mediator-probe?oob=${encoded}`
}
