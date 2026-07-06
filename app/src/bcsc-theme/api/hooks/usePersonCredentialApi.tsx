import { useCallback, useMemo } from 'react'
import { Platform } from 'react-native'
import { getBundleId } from 'react-native-device-info'
import BCSCApiClient from '../client'

export interface CreatePersonCredentialResponse {
  /** DIDComm OOB invitation URL to the Person Credential issuer (IAS). */
  invitation_url: string
  /** Present when the holder already has a live Person Credential. */
  has_active_credential?: boolean
}

const usePersonCredentialApi = (apiClient: BCSCApiClient | null) => {
  /**
   * Kicks off the BCSC-initiated ("bcsc_initiated") Person Credential flow by
   * asking the issuer for a connection invitation.
   *
   * `POST /credentials/v1/person { source_os, source_application }`
   * → `{ invitation_url, has_active_credential? }`
   *
   * `source_application` is the running app's bundle id, so the correct variant
   * (dev/test/prod) is selected automatically. Receiving the returned
   * `invitation_url` starts the connection that leads to the (now optional)
   * attestation proof request and, finally, the Person Credential offer.
   *
   * @throws {Error} When the BCSC client is not ready.
   */
  const createPersonCredential = useCallback(async (): Promise<CreatePersonCredentialResponse> => {
    if (!apiClient) {
      throw new Error('BCSC client not ready for Person Credential!')
    }

    const requestData = {
      source_os: Platform.OS,
      source_application: getBundleId(),
    }

    const response = await apiClient.post<CreatePersonCredentialResponse>(apiClient.endpoints.credential, requestData)

    return response.data
  }, [apiClient])

  return useMemo(() => ({ createPersonCredential }), [createPersonCredential])
}

export default usePersonCredentialApi
