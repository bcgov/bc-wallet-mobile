import { useCallback, useMemo } from 'react'
import { Platform } from 'react-native'
import BCSCApiClient from '../client'

export interface ServerStatusResponseData {
  minVersion: string // build number
  minVersionNumber: string // semantic version
  minVersionMessage: string
  supportedVersions: string[]
  service: string
  status: 'ok' | 'unavailable'
  serverTimestamp: Date
  statusMessage?: string
  contactLink: string
  controlNumber: number
}

export interface TermsOfUseResponseData {
  version: string
  date: string
  html: string
}

const useConfigApi = (apiClient: BCSCApiClient) => {
  /**
   * Fetches the server status from the IAS API.
   *
   * @returns {*} {Promise<ServerStatusResponseData>} A promise that resolves to the server status data.
   */
  const getServerStatus = useCallback(async () => {
    const { data, headers } = await apiClient.get<ServerStatusResponseData>(
      `${apiClient.endpoints.cardTap}/v3/status/${Platform.OS}/mobile_card`,
      {
        skipBearerAuth: true, // this endpoint does not require an access token
      }
    )

    if (!headers.date || Number.isNaN(Date.parse(headers.date))) {
      // The Date header is required to determine server clock skew, so we throw an error if it's missing or invalid
      throw new Error('getServerStatus: Invalid or missing Date header in response')
    }

    return {
      ...data,
      serverTimestamp: new Date(headers.date),
    }
  }, [apiClient])

  const getTermsOfUse = useCallback(async () => {
    const { data } = await apiClient.get<TermsOfUseResponseData>(`${apiClient.endpoints.cardTap}/v3/terms`)
    return data
  }, [apiClient])

  return useMemo(
    () => ({
      getServerStatus,
      getTermsOfUse,
    }),
    [getServerStatus, getTermsOfUse]
  )
}

export default useConfigApi
