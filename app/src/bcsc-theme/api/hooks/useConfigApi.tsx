import { useCallback, useMemo } from 'react'
import apiClient from '../client'
import { Platform } from 'react-native'

export interface ServerStatusResponseData {
  minVersion: string
  minVersionMessage: string
  supportedVersions: string[]
  service: string
  status: 'ok' | 'unavailable'
  statusMessage?: string
  contactLink: string
  controlNumber: number
}

export interface TermsOfUseResponseData {
  version: string
  date: string
  html: string
}

const useConfigApi = () => {
  /**
   * Fetches the server status from the IAS API.
   *
   * @returns {*} {Promise<ServerStatusResponseData>} A promise that resolves to the server status data.
   */
  const getServerStatus = useCallback(async () => {
    // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
    const { data } = await apiClient.get<ServerStatusResponseData>(
      `${apiClient.baseURL}/cardtap/v3/status/${Platform.OS}/mobile_card`,
      {
        skipBearerAuth: true, // this endpoint does not require an access token
      }
    )
    return data
  }, [])

  const getTermsOfUse = useCallback(async () => {
    // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
    const { data } = await apiClient.get<TermsOfUseResponseData>(`${apiClient.baseURL}/cardtap/v3/terms`)
    return data
  }, [])

  return useMemo(
    () => ({
      getServerStatus,
      getTermsOfUse,
    }),
    [getServerStatus, getTermsOfUse]
  )
}

export default useConfigApi
