import { useCallback, useMemo } from 'react'

import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import BCSCApiClient from '../client'

export interface VerifyAttestation {
  client_id: string
  device_code: string // Current devices device_code
  attestation: string // JWT assertion collected form previously registered device
  client_assertion: string // JWT assertion signed by the pending/ current device
}

// Assertion type is hardcoded
const assertionType = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

const useDeviceAttestationApi = (apiClient: BCSCApiClient | null, isClientReady: boolean = true) => {
  const [store, dispatch] = useStore<BCState>()

  const verifyAttestation = useCallback(async (data: VerifyAttestation) => {
    if (!isClientReady || !apiClient) {
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
  }, [])

  const checkAttestationStatus = useCallback(async (jwtID: string): Promise<boolean | undefined> => {
    if (!isClientReady || !apiClient) {
      throw new Error('BCSC client not ready for Device Attestation!')
    }

    const response = await apiClient.get(`${apiClient.endpoints.attestation}/${jwtID}`, {})

    if (response.status == 200) {
      return true
    } else if (response.status == 401) {
      return false
    } else if (response.status == 404) {
      return false
      // not found, it means the attestation has yet to be processed
    }
  }, [])

  return useMemo(
    () => ({
      verifyAttestation,
      checkAttestationStatus,
    }),
    [verifyAttestation, checkAttestationStatus]
  )
}

export default useDeviceAttestationApi
