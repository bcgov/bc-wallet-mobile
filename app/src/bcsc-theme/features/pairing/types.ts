import { BCSCScreens } from '../../types/navigators'

/**
 * Represents a pairing request from any source (deep link, FCM, QR code, etc.)
 */
export type PairingPayload = {
  /** Service name to match against client metadata */
  serviceTitle: string
  /** The pairing/challenge code */
  pairingCode: string
  /** Source of the pairing request for debugging */
  source: 'deep-link' | 'fcm' | 'manual' | 'qr'
}

/**
 * Alias for PairingPayload used when handling incoming pairing requests
 */
export type PairingRequest = PairingPayload

/**
 * Navigation event emitted when pairing navigation should occur
 */
export type PairingNavigationEvent = {
  screen: typeof BCSCScreens.ServiceLogin
  params: {
    serviceTitle: string
    pairingCode: string
  }
}

export type PairingNavigationListener = (event: PairingNavigationEvent) => void
export type PendingPairingListener = (hasPending: boolean) => void
