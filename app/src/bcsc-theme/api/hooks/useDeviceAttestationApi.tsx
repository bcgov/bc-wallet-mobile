import { useCallback, useMemo } from 'react'
import BCSCApiClient from '../client'

export interface VerifyAttestationPayload {
  client_id: string
  device_code: string // Current devices device_code
  attestation: string // JWT assertion collected from previously registered device
  client_assertion: string // JWT assertion signed by the pending/ current device
}

// Assertion type is hardcoded
const assertionType = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

const useDeviceAttestationApi = (apiClient: BCSCApiClient | null) => {
  /**
   * Verifies device attestation by submitting attestation data to the API
   *
   * @see `https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301576047/Self+Setup+Interaction+Design#Device-Attestation-API
   * @param {VerifyAttestationPayload} data - The attestation data containing client credentials and JWT assertions
   * @returns {Promise<boolean>} Returns true if attestation is verified (status 201), false otherwise
   *                             Response Codes:
   *                              201: Attestation request is verified
   *                              400: Bad Request for an unsuccesful response, most likely the payload is malformed
   *                              401: Unauthorized, most likely an issue with the tokens
   *                              429: Too many requests made; response contains a Retry-After header
   * @throws {Error} When BCSC client is not ready
   */
  const verifyAttestation = useCallback(
    async (data: VerifyAttestationPayload) => {
      if (!apiClient) {
        throw new Error('BCSC client not ready for Device Attestation!')
      }

      const requestData = {
        client_id: data.client_id,
        device_code: data.device_code,
        attestation: data.attestation,
        client_assertion_type: assertionType,
        client_assertion: data.client_assertion,
      }

      const response = await apiClient.post(apiClient.endpoints.attestation, requestData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })

      if (response.status == 201) {
        return true
      }

      return false
    },
    [apiClient]
  )

  /**
   * Checks the status of a device attestation request
   *
   * @see `https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301576047/Self+Setup+Interaction+Design#Device-Attestation-API
   * @param {string} jwtID - The JWT identifier to check attestation status for
   * @returns {Promise<boolean | undefined>} Returns status of the attestation request for a given jwtID.
   *                                         True is returned if attestation is complete false if response code of 401, 404 or others are returned.
   *                                         Response Codes:
   *                                            200: the attestation request is valid
   *                                            401: the request is authorized, most likely an issue with the tokens
   *                                            404: the attestation has yet to be consumed/ processed by `verifyAttestation`
   *
   * @throws {Error} When BCSC client is not ready
   */
  const checkAttestationStatus = useCallback(
    async (jwtID: string): Promise<boolean | undefined> => {
      if (!apiClient) {
        throw new Error('BCSC client not ready for Device Attestation!')
      }

      const response = await apiClient.get(`${apiClient.endpoints.attestation}/${jwtID}`, {
        suppressStatusCodeLogs: [404],
      })

      // 200 response means that the attestation request has been consumed and is valid
      if (response.status == 200) {
        return true
      }

      return false
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      verifyAttestation,
      checkAttestationStatus,
    }),
    [verifyAttestation, checkAttestationStatus]
  )
}

export default useDeviceAttestationApi
