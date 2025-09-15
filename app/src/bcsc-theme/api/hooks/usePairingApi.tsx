import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { useCallback, useMemo } from 'react'
import { signPairingCode } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'

// There is no actual data response (just a 200) from the pairing code login endpoint, so we
// define a minimal response for DX and and TypeScript
export interface PairingCodeLoginResponseData {
  success: boolean
}

const usePairingApi = (apiClient: BCSCApiClient) => {
  const loginByPairingCode = useCallback(
    async (code: string) => {
      return withAccount<PairingCodeLoginResponseData>(async (account) => {
        const { issuer, clientID } = account
        const { fcmDeviceToken, apnsToken } = await getNotificationTokens()
        const signedCode = await signPairingCode(code, issuer, clientID, fcmDeviceToken, apnsToken)
        await apiClient.post<PairingCodeLoginResponseData>(
          // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
          `${apiClient.baseURL}/cardtap/v3/mobile/assertion`,
          { assertion: signedCode },
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
        return { success: true }
      })
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      loginByPairingCode,
    }),
    [loginByPairingCode]
  )
}

export default usePairingApi
