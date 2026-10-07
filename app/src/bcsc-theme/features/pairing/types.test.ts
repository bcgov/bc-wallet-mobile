import { PairingPayload, pairingPayloadToServiceLoginParams } from './types'

const payloadFrom = (source: PairingPayload['source']): PairingPayload => ({
  serviceTitle: 'Test Service',
  pairingCode: 'CODE123',
  source,
})

describe('pairingPayloadToServiceLoginParams', () => {
  it('maps an FCM payload to push_notification', () => {
    expect(pairingPayloadToServiceLoginParams(payloadFrom('fcm'))).toMatchObject({
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      fromAppSwitch: false,
      challengeSource: 'push_notification',
    })
  })

  it('maps a deep-link payload to local_app_switch', () => {
    expect(pairingPayloadToServiceLoginParams(payloadFrom('deep-link'))).toMatchObject({
      fromAppSwitch: true,
      challengeSource: 'local_app_switch',
    })
  })

  it('maps manual and qr payloads to remote_pairing_code', () => {
    expect(pairingPayloadToServiceLoginParams(payloadFrom('manual')).challengeSource).toBe('remote_pairing_code')
    expect(pairingPayloadToServiceLoginParams(payloadFrom('qr')).challengeSource).toBe('remote_pairing_code')
  })
})
