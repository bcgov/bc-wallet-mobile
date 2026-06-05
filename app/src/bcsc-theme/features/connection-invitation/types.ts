/**
 * An out-of-band connection invitation captured from any source, carrying the
 * raw invitation URL for the agent to parse and accept once it is ready.
 */
export type ConnectionInvitationPayload = {
  /** Raw invitation URL, e.g. `bcwallet://aries_connection_invitation?oob=<base64>` */
  url: string
  /** Source of the invitation, for debugging */
  source: 'deep-link' | 'fcm' | 'qr'
}

export type ConnectionInvitationListener = (payload: ConnectionInvitationPayload) => void
export type PendingConnectionInvitationListener = (hasPending: boolean) => void
