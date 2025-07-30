import { useMemo } from 'react'
import usePairingApi from './usePairingApi'
import useConfigApi from './useConfigApi'
import useRegistrationApi from './useRegistrationApi'
import useAuthorizationApi from './useAuthorizationApi'
import useTokenApi from './useTokens'
import useUserApi from './useUserApi'
import useEvidenceApi from './useEvidenceApi'

const useApi = () => {
  const config = useConfigApi()
  const pairing = usePairingApi()
  const registration = useRegistrationApi()
  const authorization = useAuthorizationApi()
  const token = useTokenApi()
  const user = useUserApi()
  const evidence = useEvidenceApi()

  return useMemo(
    () => ({
      config,
      pairing,
      registration,
      authorization,
      token,
      user,
      evidence,
    }),
    [config, pairing, registration, authorization, token, user, evidence]
  )
}

export default useApi
