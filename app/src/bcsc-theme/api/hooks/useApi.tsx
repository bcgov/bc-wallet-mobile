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
    }),
    [config, pairing, registration, authorization, token, user, evidence, metadata, jwks]
  )
}

export default useApi
