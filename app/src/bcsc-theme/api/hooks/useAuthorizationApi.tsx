import { useCallback, useMemo } from 'react'
import apiClient from '../client'
import { withAccount } from './withAccountGuard'
import { createDeviceAuthTokenHintJWT, DeviceAuthTokenHint } from '@/bcsc-theme/utils/device-auth-token-hint'

export enum BCSCCardProcess {
  BCSC = 'IDIM L3 Remote BCSC Photo Identity Verification',
  BCSCNonPhoto = 'IDIM L3 Remote BCSC Non-Photo Identity Verification',
  NonBCSC = 'IDIM L3 Remote Non-BCSC Identity Verification',
}
export interface VerifyInPersonResponseData {
  device_code: string
  user_code: string
  verified_email: string
  expires_in: number
  process: BCSCCardProcess
}

type AuthorizeDeviceTokenHint = Omit<DeviceAuthTokenHint, 'clientId' | 'audience'>

const useAuthorizationApi = () => {
  // TODO: fetch evidence API endpoint from this endpoint
  const authorizeDevice = useCallback(async (serial: string, birthdate: Date): Promise<VerifyInPersonResponseData> => {
    return withAccount<VerifyInPersonResponseData>(async (account) => {
      const body = {
        response_type: 'device_code',
        client_id: account.clientID,
        card_serial_number: serial,
        birth_date: birthdate.toISOString().split('T')[0],
        scope: 'openid profile address offline_access',
      }

      apiClient.logger.info('Registration body:', body)

      const { data } = await apiClient.post<VerifyInPersonResponseData>(apiClient.endpoints.deviceAuthorization, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })

      return data
    })
  }, [])

  const authorizeDeviceWithTokenHint = useCallback(async (tokenHint: AuthorizeDeviceTokenHint) => {
    return withAccount<VerifyInPersonResponseData>(async (account) => {
      const body = {
        response_type: 'device_code',
        client_id: account.clientID,
        id_token_hint: createDeviceAuthTokenHintJWT({
          clientId: account.clientID,
          audience: account.issuer,
          address: tokenHint.address,
          firstName: tokenHint.firstName,
          lastName: tokenHint.lastName,
          birthDate: tokenHint.birthDate,
          middleNames: tokenHint.middleNames,
          gender: tokenHint.gender,
        }),
        scope: 'openid profile address offline_access',
      }

      apiClient.logger.info('Registration body:', body)

      const { data } = await apiClient.post<VerifyInPersonResponseData>(apiClient.endpoints.deviceAuthorization, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })

      return data
    })
  }, [])

  return useMemo(
    () => ({
      authorizeDevice,
      authorizeDeviceWithTokenHint,
    }),
    [authorizeDevice, authorizeDeviceWithTokenHint]
  )
}

export default useAuthorizationApi
