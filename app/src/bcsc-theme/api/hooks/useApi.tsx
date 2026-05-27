import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useMemo } from 'react'
import useAuthorizationApi from './useAuthorizationApi'
import useConfigApi from './useConfigApi'
import useDeviceAttestationApi from './useDeviceAttestationApi'
import useEvidenceApi from './useEvidenceApi'
import useJwksApi from './useJwksApi'
import useMetadataApi from './useMetadataApi'
import usePairingApi from './usePairingApi'
import usePersonCredentialApi from './usePersonCredentialApi'
import useRegistrationApi from './useRegistrationApi'
import useTokenApi from './useTokens'
import useUserApi from './useUserApi'
import useVideoCallApi from './useVideoCallApi'

const useApi = () => {
  const apiClient = useBCSCApiClient()
  const config = useConfigApi(apiClient)
  const registration = useRegistrationApi(apiClient)
  const pairing = usePairingApi(apiClient)
  const personCredential = usePersonCredentialApi(apiClient)
  const authorization = useAuthorizationApi(apiClient)
  const token = useTokenApi(apiClient)
  const user = useUserApi(apiClient)
  const evidence = useEvidenceApi(apiClient)
  const metadata = useMetadataApi(apiClient)
  const jwks = useJwksApi(apiClient)
  const video = useVideoCallApi(apiClient)
  const deviceAttestation = useDeviceAttestationApi(apiClient)

  return useMemo(
    () => ({
      config,
      pairing,
      personCredential,
      registration,
      authorization,
      token,
      user,
      evidence,
      metadata,
      jwks,
      video,
      deviceAttestation,
    }),
    [
      config,
      pairing,
      personCredential,
      registration,
      authorization,
      token,
      user,
      evidence,
      metadata,
      jwks,
      video,
      deviceAttestation,
    ]
  )
}

export default useApi
