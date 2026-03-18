import { useCallback, useMemo } from 'react'
import { Platform } from 'react-native'
import { getBundleId } from 'react-native-device-info'
import BCSCApiClient from '../client'

export interface IssueCredentialResponseData {
  invitation_url: string
  has_active_credential: boolean | null
}

const useCredentialApi = (apiClient: BCSCApiClient) => {
  const issueCredential = useCallback(async (): Promise<IssueCredentialResponseData> => {
    const { data } = await apiClient.post<IssueCredentialResponseData>(apiClient.endpoints.credential, {
      source_os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      source_application: getBundleId(),
    })
    return data
  }, [apiClient])

  return useMemo(() => ({ issueCredential }), [issueCredential])
}

export default useCredentialApi
