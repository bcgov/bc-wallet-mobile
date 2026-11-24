import { BCSCScreens } from '../../types/navigators'

export type PairingPayload = {
  /** Service name to match against client metadata */
  serviceTitle: string
  /** The pairing/challenge code */
  pairingCode: string
  /** Source of the pairing request for debugging */
  source: 'deep-link' | 'fcm' | 'manual' | 'qr'
}

export type PairingNavigationEvent = {
  screen: typeof BCSCScreens.ServiceLogin
  params: {
    serviceTitle: string
    pairingCode: string
    fromAppSwitch?: boolean
  }
}

export type PairingNavigationListener = (event: PairingNavigationEvent) => void
export type PendingPairingListener = (hasPending: boolean) => void

export const pairingPayloadToServiceLoginParams = (payload: PairingPayload): PairingNavigationEvent['params'] => ({
  serviceTitle: payload.serviceTitle,
  pairingCode: payload.pairingCode,
  fromAppSwitch: payload.source === 'deep-link',
})
