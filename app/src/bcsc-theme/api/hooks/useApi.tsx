import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useMemo } from 'react'
import useAuthorizationApi from './useAuthorizationApi'
import useConfigApi from './useConfigApi'
import useDeviceAttestationApi from './useDeviceAttestationApi'
import useEvidenceApi from './useEvidenceApi'
import useJwksApi from './useJwksApi'
import useMetadataApi from './useMetadataApi'
import usePairingApi from './usePairingApi'
import useRegistrationApi from './useRegistrationApi'
import useTokenApi from './useTokens'
import useUserApi from './useUserApi'
import useCredentialApi from './useCredentialApi'
import useVideoCallApi from './useVideoCallApi'

const useApi = () => {
  const apiClient = useBCSCApiClient()
  const config = useConfigApi(apiClient)
  const registration = useRegistrationApi(apiClient)
  const pairing = usePairingApi(apiClient)
  const authorization = useAuthorizationApi(apiClient)
  const token = useTokenApi(apiClient)
  const user = useUserApi(apiClient)
  const evidence = useEvidenceApi(apiClient)
  const metadata = useMetadataApi(apiClient)
  const jwks = useJwksApi(apiClient)
  const video = useVideoCallApi(apiClient)
  const deviceAttestation = useDeviceAttestationApi(apiClient)
  const credential = useCredentialApi(apiClient)

  return useMemo(
    () => ({
      config,
      pairing,
      registration,
      authorization,
      token,
      user,
      evidence,
      metadata,
      jwks,
      video,
      deviceAttestation,
      credential,
    }),
    [config, pairing, registration, authorization, token, user, evidence, metadata, jwks, video, deviceAttestation, credential]
  )
}

export default useApi
