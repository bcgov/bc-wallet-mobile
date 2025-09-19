import { useCallback, useMemo } from 'react'

import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import BCSCApiClient from '../client'

export interface VerifyAttestation {
  client_id: string
  device_code: string
  attestation: string
  client_assertion: string
}

// Assertion type is hardcoded
const assertionType = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

const useDeviceAttestationApi = (apiClient: BCSCApiClient | null, clientIsReady: boolean = true) => {
  const [store, dispatch] = useStore<BCState>()

  const verifyAttestation = useCallback(async (data: VerifyAttestation) => {
    if (!clientIsReady || !apiClient) {
      throw new Error('BCSC client not ready for Device Attestation!')
    }

    const formData = new URLSearchParams()
    formData.append('client_id', data.client_id)
    formData.append('device_code', data.device_code)
    formData.append('attestation', data.attestation)
    formData.append('client_assertion_type', assertionType)
    formData.append('client_assertion', data.client_assertion)

    const response = await apiClient.post(apiClient.endpoints.attestation, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (response.status == 201) {
      // successful
    } else if (response.status == 400) {
    } else if (response.status == 401) {
    } else if (response.status == 429) {
    } else {
    }

    return
  }, [])

  const checkAttestationStatus = useCallback(async (jwtID: string) => {
    if (!clientIsReady || !apiClient) {
      throw new Error('BCSC client not ready for Device Attestation!')
    }

    const response = await apiClient.post(`${apiClient.endpoints.attestation}/${jwtID}`, {
      headers: { Authorization: `Bearer ${store.bcsc.registrationAccessToken}` },
    })

    if (response.status == 200) {
    } else if (response.status == 401) {
    } else if (response.status == 404) {
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
