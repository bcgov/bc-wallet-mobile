import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useMemo } from 'react'
import useAuthorizationApi from './useAuthorizationApi'
import useConfigApi from './useConfigApi'
import useEvidenceApi from './useEvidenceApi'
import useJwksApi from './useJwksApi'
import useMetadataApi from './useMetadataApi'
import usePairingApi from './usePairingApi'
import useRegistrationApi from './useRegistrationApi'
import useTokenApi from './useTokens'
import useUserApi from './useUserApi'
import useVideoCallApi from './useVideoCallApi'

const useApi = () => {
  const apiClient = useBCSCApiClient()
  const config = useConfigApi(apiClient)
  const pairing = usePairingApi(apiClient)
  const registration = useRegistrationApi(apiClient)
  const authorization = useAuthorizationApi(apiClient)
  const token = useTokenApi(apiClient)
  const user = useUserApi(apiClient)
  const evidence = useEvidenceApi(apiClient)
  const metadata = useMetadataApi(apiClient)
  const jwks = useJwksApi(apiClient)
  const video = useVideoCallApi(apiClient)

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
    }),
    [config, pairing, registration, authorization, token, user, evidence, metadata, jwks, video]
  )
}

export default useApi
