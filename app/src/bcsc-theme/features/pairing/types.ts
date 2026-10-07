import type { ChallengeSource } from 'react-native-bcsc-core'
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
 * Navigation event emitted when pairing navigation should occur
 */
export type PairingNavigationEvent = {
  screen: typeof BCSCScreens.ServiceLogin
  params: {
    serviceTitle: string
    pairingCode: string
    fromAppSwitch?: boolean
    challengeSource: ChallengeSource
  }
}

export type PairingNavigationListener = (event: PairingNavigationEvent) => void
export type PendingPairingListener = (hasPending: boolean) => void

const CHALLENGE_SOURCE_BY_PAIRING_SOURCE: Record<PairingPayload['source'], ChallengeSource> = {
  fcm: 'push_notification',
  'deep-link': 'local_app_switch',
  manual: 'remote_pairing_code',
  // Matches v3, which reported QR scans as remote_pairing_code
  qr: 'remote_pairing_code',
}

/**
 * Converts a PairingPayload to the parameters required for service login
 * @param payload The pairing payload to convert
 * @returns PairingNavigationEvent['params'] containing serviceTitle, pairingCode, challengeSource, and optional fromAppSwitch
 */
export const pairingPayloadToServiceLoginParams = (payload: PairingPayload): PairingNavigationEvent['params'] => ({
  serviceTitle: payload.serviceTitle,
  pairingCode: payload.pairingCode,
  fromAppSwitch: payload.source === 'deep-link',
  challengeSource: CHALLENGE_SOURCE_BY_PAIRING_SOURCE[payload.source],
})
