import { useMemo } from 'react'
import usePairingApi from './usePairingApi'
import useConfigApi from './useConfigApi'
import useRegistrationApi from './useRegistrationApi'
import useAuthorizationApi from './useAuthorizationApi'
import useTokenApi from './useTokens'
import useUserApi from './useUserApi'
import useEvidenceApi from './useEvidenceApi'
import useMetadataApi from './useMetadataApi'
import useJwksApi from './useJwksApi'
import useVideoCallApi from './useVideoCallApi'

const useApi = () => {
  const config = useConfigApi()
  const pairing = usePairingApi()
  const registration = useRegistrationApi()
  const authorization = useAuthorizationApi()
  const token = useTokenApi()
  const user = useUserApi()
  const evidence = useEvidenceApi()
  const metadata = useMetadataApi()
  const jwks = useJwksApi()
  const video = useVideoCallApi()

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
