import usePairingApi from './usePairingApi'
import useConfigApi from './useConfigApi'
import useRegistrationApi from './useRegistrationApi'
import useAuthorizationApi from './useAuthorizationApi'
import useTokenApi from './useTokens'

const useApi = () => {
  const config = useConfigApi()
  const pairing = usePairingApi()
  const registration = useRegistrationApi()
  const authorization = useAuthorizationApi()
  const token = useTokenApi()

  return {
    config,
    pairing,
    registration,
    authorization,
    token,
  }
}

export default useApi
