import { useCallback, useMemo } from 'react'
import { Platform } from 'react-native'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'

// The IAS Person Credential is always issued to BC Wallet. The backend keys the
// issuance/destination off source_application, and only recognizes BC Wallet's
// identifier — sending this build's own bundle id (e.g. ca.bc.gov.id.servicescard.dev)
// leaves the issuer unable to complete the connection. See v3 (ias-android) which
// hands the invitation to ca.bc.gov.BCWallet for consumption.
const BC_WALLET_APPLICATION_ID = 'ca.bc.gov.BCWallet'

/**
 * Request body for creating a Person Credential.
 *
 * Mirrors the v3 (BCSC) contract: the backend uses these fields to record which
 * app/platform requested the invitation.
 */
export interface CreatePersonCredentialPayload {
  source_os: string
  source_application: string
}

/**
 * Successful response from the Person Credential endpoint.
 *
 * @property invitation_url - The DIDComm out-of-band invitation URL to be consumed
 *                            in order to receive the Person Credential.
 * @property has_active_credential - Whether an active Person Credential already exists
 *                                   for this account. May be absent in older responses.
 */
export interface PersonCredentialResponseData {
  invitation_url: string
  has_active_credential?: boolean
}

/**
 * Error response (typically HTTP 400) from the Person Credential endpoint.
 * Downstream UI maps these to the appropriate error screens (e.g. account problem,
 * person credential unavailable).
 */
export interface PersonCredentialErrorResponseData {
  error: string
  error_description: string
}

// The backend expects a capitalized OS name (e.g. "iOS", "Android") rather than
// React Native's lowercase Platform.OS values.
const getSourceOs = (): string => {
  switch (Platform.OS) {
    case 'ios':
      return 'iOS'
    case 'android':
      return 'Android'
    default:
      return Platform.OS
  }
}

const usePersonCredentialApi = (apiClient: BCSCApiClient) => {
  /**
   * Requests a Person Credential invitation from IAS.
   *
   * This is the v4 equivalent of the call BCSC v3 made to obtain the invitation that
   * was previously handed off to BC Wallet. In the unified app the returned
   * `invitation_url` is consumed in-app to receive the credential.
   *
   * @see `POST /credentials/v1/person`
   * @returns {*} {Promise<PersonCredentialResponseData>} A promise resolving to the
   *          invitation URL and active-credential status.
   * @throws {AppError} On a non-2xx response; 400 bodies follow `PersonCredentialErrorResponseData`.
   */
  const createPersonCredential = useCallback(async (): Promise<PersonCredentialResponseData> => {
    return withAccount(async () => {
      const payload: CreatePersonCredentialPayload = {
        source_os: getSourceOs(),
        source_application: BC_WALLET_APPLICATION_ID,
      }

      const { data } = await apiClient.post<PersonCredentialResponseData>(apiClient.endpoints.credential, payload)

      return data
    })
  }, [apiClient])

  return useMemo(
    () => ({
      createPersonCredential,
    }),
    [createPersonCredential]
  )
}

export default usePersonCredentialApi
