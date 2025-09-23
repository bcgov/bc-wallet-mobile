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

const useDeviceAttestationApi = (apiClient: BCSCApiClient | null, clientIsReady: boolean = true) => {
  const [store, dispatch] = useStore<BCState>()

  const verifyAttestation = useCallback(async (data: VerifyAttestation) => {
    console.log('_____________')
    console.log('_____________')
    console.log('_____________')
    if (!clientIsReady || !apiClient) {
      throw new Error('BCSC client not ready for Device Attestation!')
    }

    const formData = new URLSearchParams()
    formData.append('client_id', data.client_id)
    formData.append('device_code', data.device_code)
    formData.append('attestation', data.attestation)
    formData.append('client_assertion_type', assertionType)
    formData.append('client_assertion', data.client_assertion)
    console.log('SENDING ATTESTATION REQUEST', formData.toString())
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

  const checkAttestationStatus = useCallback(async (jwtID: string): Promise<boolean | undefined> => {
    if (!clientIsReady || !apiClient) {
      throw new Error('BCSC client not ready for Device Attestation!')
    }

    const response = await apiClient.post(`${apiClient.endpoints.attestation}/${jwtID}`, {
      headers: { Authorization: `Bearer ${store.bcsc.registrationAccessToken}` },
    })

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
